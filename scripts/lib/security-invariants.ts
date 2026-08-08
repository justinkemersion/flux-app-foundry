/**
 * Executable Foundry security baseline assertions (static; no Flux credentials).
 *
 * These check *security properties*, not template file names. A fork may
 * satisfy every invariant with its own migration numbering and its own
 * ownership column names.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { SecurityCheck, SecurityCheckStatus } from "./baseline-manifest";
import { readBaselineManifest } from "./baseline-manifest";
import { classifyFluxAccess } from "./flux-access-analysis";
import {
  buildSqlModel,
  isTenantOwnedTable,
  isTenantScopedPolicy,
  isWriteCommand,
  ownershipColumns,
  parentOwnershipVerdict,
  subjectBindingVerdict,
  type SqlModel,
} from "./sql-policy-analysis";

function walkTs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkTs(p));
    else if (/\.(ts|tsx)$/.test(name) && !name.includes(".test.")) out.push(p);
  }
  return out;
}

function posix(p: string): string {
  return p.split(sep).join("/");
}

function check(
  id: string,
  status: SecurityCheckStatus,
  detail: string,
  notes?: string[],
): SecurityCheck {
  return { id, ok: status === "pass", status, detail, notes };
}

function worst(a: SecurityCheckStatus, b: SecurityCheckStatus): SecurityCheckStatus {
  if (a === "fail" || b === "fail") return "fail";
  if (a === "unknown" || b === "unknown") return "unknown";
  return "pass";
}

export function loadSqlModel(root: string): SqlModel | null {
  const migDir = join(root, "sql/migrations");
  if (!existsSync(migDir)) return null;
  const files = readdirSync(migDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  return buildSqlModel(
    files.map((file) => ({
      file,
      sql: readFileSync(join(migDir, file), "utf8"),
    })),
  );
}

type OwnershipConfig = {
  additionalOwnershipColumns: string[];
  exemptTables: Set<string>;
};

function ownershipConfig(root: string): OwnershipConfig {
  const manifest = readBaselineManifest(root);
  const cfg = manifest?.securityBaseline?.ownership;
  return {
    additionalOwnershipColumns: cfg?.additionalOwnershipColumns ?? [],
    exemptTables: new Set((cfg?.exemptTables ?? []).map((t) => t.toLowerCase())),
  };
}

/**
 * Every RLS-enabled table must constrain its tenant-facing policies by the
 * JWT subject. The ownership column is discovered from the comparison itself,
 * so `user_id`, `owner_user_id`, `member_user_id` and `created_by` all work.
 */
function tenantOwnershipCheck(model: SqlModel, cfg: OwnershipConfig): SecurityCheck {
  const notes: string[] = [];
  let status: SecurityCheckStatus = "pass";
  let firstFailure = "";
  let firstReview = "";

  for (const table of model.tables.values()) {
    if (!table.rlsEnabled || cfg.exemptTables.has(table.name)) continue;
    const policies = model.policies.filter(
      (p) => p.table === table.name && isTenantScopedPolicy(p),
    );
    if (policies.length === 0) {
      // RLS on with no tenant policy is deny-by-default: safe, not a gap.
      continue;
    }
    const binding = (p: (typeof policies)[number]) => {
      if (
        cfg.additionalOwnershipColumns.some((c) =>
          new RegExp(`\\b${c}\\b`, "i").test(p.body),
        )
      ) {
        return "bound" as const;
      }
      return subjectBindingVerdict(model, p.body);
    };

    const unboundWrites = policies.filter(
      (p) => isWriteCommand(p.command) && binding(p) === "unbound",
    );
    const needsReview = policies.filter((p) => {
      const b = binding(p);
      return b === "unknown" || (b === "unbound" && !isWriteCommand(p.command));
    });

    if (unboundWrites.length > 0) {
      status = "fail";
      const names = unboundWrites.map((p) => p.name).join(", ");
      if (!firstFailure) {
        firstFailure = `${table.name} allows writes not bound to the JWT subject (${names})`;
      }
      notes.push(`FAIL ${table.name}: unbound write policies ${names}`);
      continue;
    }
    if (needsReview.length > 0) {
      status = worst(status, "unknown");
      const names = needsReview.map((p) => p.name).join(", ");
      if (!firstReview) {
        firstReview = `${table.name} has policies whose tenant binding could not be proven (${names})`;
      }
      notes.push(`REVIEW ${table.name}: ${names}`);
      continue;
    }
    const cols = new Set<string>();
    for (const p of policies) {
      for (const c of ownershipColumns(p.body)) cols.add(c);
    }
    if (cols.size > 0) notes.push(`${table.name}: ownership via ${[...cols].join(", ")}`);
  }

  return check(
    "tenant-rls-jwt-sub",
    status,
    status === "pass"
      ? "RLS policies bind rows to the JWT subject on every tenant table"
      : firstFailure || firstReview,
    notes,
  );
}

/**
 * Child rows must not be reachable purely because the caller supplied their
 * own owner id. Where a table has a foreign key into a tenant-owned parent,
 * its policies must also prove ownership of that parent.
 */
function childParentOwnershipCheck(model: SqlModel, cfg: OwnershipConfig): SecurityCheck {
  const notes: string[] = [];
  let status: SecurityCheckStatus = "pass";
  let firstFailure = "";
  let firstReview = "";
  let evaluated = 0;

  for (const table of model.tables.values()) {
    if (!table.rlsEnabled || cfg.exemptTables.has(table.name)) continue;
    const policies = model.policies.filter(
      (p) => p.table === table.name && isTenantScopedPolicy(p),
    );
    if (policies.length === 0) continue;

    for (const fk of table.foreignKeys) {
      if (fk.parentTable === table.name) continue;
      if (!isTenantOwnedTable(model, fk.parentTable)) continue;
      if (!model.tables.has(fk.parentTable)) continue;
      evaluated++;

      for (const p of policies) {
        let verdict = parentOwnershipVerdict(model, p.body, fk);

        // A nullable parent may legitimately be absent, provided the policy
        // handles the null case explicitly alongside the ownership proof.
        if (
          verdict === "unprotected" &&
          !table.requiredFkColumns.has(fk.column) &&
          new RegExp(`${fk.column}\\s+is\\s+null`, "i").test(p.body)
        ) {
          verdict = parentOwnershipVerdict(model, p.body, fk) === "protected"
            ? "protected"
            : "unprotected";
        }

        if (verdict === "protected") continue;
        const label = `${table.name}.${fk.column} -> ${fk.parentTable} (policy ${p.name})`;

        if (verdict === "unprotected" && isWriteCommand(p.command)) {
          status = "fail";
          if (!firstFailure) {
            firstFailure = `${table.name} policy ${p.name} allows attaching a row to an unowned ${fk.parentTable} row`;
          }
          notes.push(`FAIL ${label}`);
          continue;
        }

        // Unbound reads and unresolvable delegation are review items, not
        // proven vulnerabilities.
        status = worst(status, "unknown");
        if (!firstReview) {
          firstReview =
            verdict === "unprotected"
              ? `${table.name} policy ${p.name} reads child rows without proving ${fk.parentTable} ownership`
              : `${table.name} policy ${p.name} delegates parent ownership to logic this analyzer cannot resolve`;
        }
        notes.push(`REVIEW ${label}`);
      }
    }
  }

  if (evaluated === 0) {
    return check(
      "child-row-parent-ownership",
      "pass",
      "no tenant-owned parent/child relationships require this invariant",
      notes,
    );
  }

  return check(
    "child-row-parent-ownership",
    status,
    status === "pass"
      ? `child rows require parent ownership (${evaluated} parent links verified)`
      : firstFailure || firstReview,
    notes,
  );
}

/** Flux is server-only, reached through the boundary module. */
function fluxAccessChecks(root: string): SecurityCheck[] {
  const boundaryDir = posix(join("lib", "flux")) + "/";
  const violations: Array<{ kind: string; detail: string }> = [];

  for (const dir of ["app", "components", "lib"]) {
    for (const file of walkTs(join(root, dir))) {
      const rel = posix(relative(root, file));
      const src = readFileSync(file, "utf8");
      const isBoundary = rel.startsWith(boundaryDir);
      const browserReachable =
        /^\s*["']use client["']/m.test(src) || rel.startsWith("components/");
      violations.push(
        ...classifyFluxAccess({ relPath: rel, src, isBoundary, browserReachable }),
      );
    }
  }

  const browserHits = violations.filter(
    (v) => v.kind === "browser-flux-access" || v.kind === "flux-fetch-outside-boundary",
  );
  const secretHits = violations.filter(
    (v) => v.kind === "browser-flux-secret" || v.kind === "public-flux-env",
  );

  return [
    check(
      "no-browser-flux-access",
      browserHits.length === 0 ? "pass" : "fail",
      browserHits.length === 0
        ? "Flux is reached only from server code via lib/flux"
        : browserHits[0]!.detail,
      browserHits.map((v) => v.detail),
    ),
    check(
      "no-browser-flux-secrets",
      secretHits.length === 0 ? "pass" : "fail",
      secretHits.length === 0
        ? "Flux credentials not reachable from the browser bundle"
        : secretHits[0]!.detail,
      secretHits.map((v) => v.detail),
    ),
  ];
}

function actionErrorCheck(root: string): SecurityCheck {
  const path = join(root, "lib/actions/result.ts");
  if (!existsSync(path)) {
    return check("action-errors-no-leak", "fail", "lib/actions/result.ts missing");
  }
  const src = readFileSync(path, "utf8");
  const ok =
    src.includes("FluxHttpError") &&
    src.includes("Request failed. Please try again.") &&
    src.includes("Unauthorized");
  return check(
    "action-errors-no-leak",
    ok ? "pass" : "fail",
    ok
      ? "actionError sanitizes Unauthorized/Flux/generic errors"
      : "actionError missing fail-closed sanitization patterns",
  );
}

function authHelperCheck(root: string): SecurityCheck {
  for (const rel of ["lib/flux/auth.ts", "lib/auth.ts"]) {
    const path = join(root, rel);
    if (!existsSync(path)) continue;
    const src = readFileSync(path, "utf8");
    const ok =
      /Unauthorized/i.test(src) || src.includes("requireUser") || src.includes("auth(");
    return check(
      "fail-closed-auth-helper",
      ok ? "pass" : "fail",
      ok
        ? "auth helper present for fail-closed session checks"
        : `${rel} does not appear to enforce session`,
    );
  }
  return check("fail-closed-auth-helper", "fail", "no fail-closed auth helper found");
}

/** Evaluate the SQL-side invariants against an already-built model. */
export function evaluateSqlSecurity(
  model: SqlModel,
  cfg: Partial<OwnershipConfig> = {},
): SecurityCheck[] {
  const resolved: OwnershipConfig = {
    additionalOwnershipColumns: cfg.additionalOwnershipColumns ?? [],
    exemptTables: cfg.exemptTables ?? new Set(),
  };
  return [tenantOwnershipCheck(model, resolved), childParentOwnershipCheck(model, resolved)];
}

export function runSecurityInvariants(root: string): SecurityCheck[] {
  const cfg = ownershipConfig(root);
  const model = loadSqlModel(root);

  const sqlChecks: SecurityCheck[] = model
    ? evaluateSqlSecurity(model, cfg)
    : [
        check("tenant-rls-jwt-sub", "unknown", "sql/migrations not present in this repo"),
        check(
          "child-row-parent-ownership",
          "unknown",
          "sql/migrations not present in this repo",
        ),
      ];

  return [
    ...sqlChecks,
    ...fluxAccessChecks(root),
    actionErrorCheck(root),
    authHelperCheck(root),
  ];
}

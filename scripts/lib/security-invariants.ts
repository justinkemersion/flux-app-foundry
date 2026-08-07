/**
 * Executable Foundry security baseline assertions (static; no Flux credentials).
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { SecurityCheck } from "./baseline-manifest";

const RLS_INVARIANT =
  "(current_setting('request.jwt.claims', true)::json->>'sub') = user_id";

const SECRET_PATTERNS = [
  /NEXT_PUBLIC_FLUX_/i,
  /NEXT_PUBLIC_.*FLUX_GATEWAY/i,
  /process\.env\.FLUX_URL/,
  /process\.env\.FLUX_GATEWAY_JWT_SECRET/,
  /process\.env\.PGRST_JWT_SECRET/,
];

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

function isClientModule(src: string): boolean {
  return src.includes('"use client"') || src.includes("'use client'");
}

export function runSecurityInvariants(root: string): SecurityCheck[] {
  const checks: SecurityCheck[] = [];
  const migDir = join(root, "sql/migrations");

  const requiredMigrations = [
    "0001_profiles.sql",
    "0002_profiles_grants.sql",
    "0004_core_entities.sql",
    "0005_core_grants.sql",
    "0006_child_record_ownership.sql",
  ];
  const missingMigs = requiredMigrations.filter(
    (f) => !existsSync(join(migDir, f)),
  );
  checks.push({
    id: "security-migrations-present",
    ok: missingMigs.length === 0,
    detail:
      missingMigs.length === 0
        ? "required security migrations present"
        : `missing migrations: ${missingMigs.join(", ")}`,
  });

  let rlsOk = true;
  let rlsDetail = "RLS jwt.sub = user_id present on policy migrations";
  if (existsSync(migDir)) {
    const rlsFiles = readdirSync(migDir).filter(
      (f) => f.endsWith(".sql") && !f.includes("grants"),
    );
    for (const file of rlsFiles) {
      const sql = readFileSync(join(migDir, file), "utf8");
      if (
        !sql.toLowerCase().includes("row level security") &&
        !sql.toLowerCase().includes("enable row level security")
      ) {
        continue;
      }
      const matches = sql.split(RLS_INVARIANT).length - 1;
      if (matches < 4) {
        rlsOk = false;
        rlsDetail = `${file} lacks tenant RLS invariant (found ${matches})`;
        break;
      }
    }
  } else {
    rlsOk = false;
    rlsDetail = "sql/migrations missing";
  }
  checks.push({ id: "tenant-rls-jwt-sub", ok: rlsOk, detail: rlsDetail });

  const childPath = join(migDir, "0006_child_record_ownership.sql");
  let childOk = false;
  let childDetail = "0006_child_record_ownership.sql missing";
  if (existsSync(childPath)) {
    const sql = readFileSync(childPath, "utf8");
    childOk =
      sql.includes("exists (") &&
      sql.includes("from records r") &&
      sql.includes("r.id = record_id") &&
      sql.toLowerCase().includes("notes") &&
      sql.toLowerCase().includes("record_tags");
    childDetail = childOk
      ? "child rows require parent record ownership"
      : "0006 does not enforce parent ownership for notes/record_tags";
  }
  checks.push({
    id: "child-row-parent-ownership",
    ok: childOk,
    detail: childDetail,
  });

  let rawFetchOk = true;
  let rawFetchDetail = "no raw fetch() outside lib/flux/client.ts";
  for (const dir of ["lib", "app"]) {
    for (const file of walkTs(join(root, dir))) {
      if (file.endsWith(join("flux", "client.ts"))) continue;
      const src = readFileSync(file, "utf8");
      if (src.includes("fetch(")) {
        rawFetchOk = false;
        rawFetchDetail = `raw fetch() in ${relative(root, file)}`;
        break;
      }
    }
    if (!rawFetchOk) break;
  }
  checks.push({
    id: "no-raw-flux-fetch",
    ok: rawFetchOk,
    detail: rawFetchDetail,
  });

  let secretsOk = true;
  let secretsDetail = "Flux credentials not referenced in client modules";
  for (const dir of ["app", "components"]) {
    for (const file of walkTs(join(root, dir))) {
      const src = readFileSync(file, "utf8");
      if (!isClientModule(src) && !relative(root, file).startsWith("components/")) {
        continue;
      }
      for (const re of SECRET_PATTERNS) {
        if (re.test(src)) {
          secretsOk = false;
          secretsDetail = `possible Flux secret exposure in ${relative(root, file)}`;
          break;
        }
      }
      if (!secretsOk) break;
    }
    if (!secretsOk) break;
  }
  // Also ban NEXT_PUBLIC_FLUX_* anywhere under app/components/lib (except docs)
  if (secretsOk) {
    for (const dir of ["app", "components", "lib"]) {
      for (const file of walkTs(join(root, dir))) {
        const src = readFileSync(file, "utf8");
        if (/NEXT_PUBLIC_FLUX_/i.test(src)) {
          secretsOk = false;
          secretsDetail = `NEXT_PUBLIC_FLUX_* in ${relative(root, file)}`;
          break;
        }
      }
      if (!secretsOk) break;
    }
  }
  checks.push({
    id: "no-browser-flux-secrets",
    ok: secretsOk,
    detail: secretsDetail,
  });

  const actionPath = join(root, "lib/actions/result.ts");
  let actionOk = false;
  let actionDetail = "lib/actions/result.ts missing";
  if (existsSync(actionPath)) {
    const src = readFileSync(actionPath, "utf8");
    actionOk =
      src.includes("FluxHttpError") &&
      src.includes("Request failed. Please try again.") &&
      src.includes("Unauthorized");
    actionDetail = actionOk
      ? "actionError sanitizes Unauthorized/Flux/generic errors"
      : "actionError missing fail-closed sanitization patterns";
  }
  checks.push({
    id: "action-errors-no-leak",
    ok: actionOk,
    detail: actionDetail,
  });

  const authPath = join(root, "lib/flux/auth.ts");
  let authOk = false;
  let authDetail = "lib/flux/auth.ts missing";
  if (existsSync(authPath)) {
    const src = readFileSync(authPath, "utf8");
    authOk =
      src.includes("Unauthorized") ||
      src.includes("unauthorized") ||
      src.includes("requireUser") ||
      src.includes("auth(");
    authDetail = authOk
      ? "auth helper present for fail-closed session checks"
      : "auth helper does not appear to enforce session";
  }
  checks.push({
    id: "fail-closed-auth-helper",
    ok: authOk,
    detail: authDetail,
  });

  return checks;
}

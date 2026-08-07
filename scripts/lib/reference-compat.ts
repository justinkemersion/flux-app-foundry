/**
 * Canonical reference-app compatibility checks.
 * Local checks are deterministic (no Flux credentials).
 * Live / Flux-core checks are opt-in and never faked.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  evaluateBaselineStatus,
  readBaselineManifest,
} from "./baseline-manifest";
import { runSecurityInvariants } from "./security-invariants";
import {
  probeAuthenticatedBridge,
  probeUnauthenticatedProfiles,
} from "./flux-probes";

export const REFERENCE_FIXTURE_DIR = "fixtures/reference-app";
export const REFERENCE_MANIFEST_FILE = "manifest.json";

export type CompatMode = "local" | "live";
export type CompatOutcome = "pass" | "fail" | "pending" | "skipped";

export type ReferenceCapability = {
  id: string;
  mode: CompatMode;
  category: string;
  summary: string;
  requires?: string[];
  pendingReason?: string;
};

export type ReferenceManifest = {
  id: string;
  name: string;
  purpose: string;
  ownership: string;
  subject: string;
  baselineVersion: string;
  docs: string[];
  capabilities: ReferenceCapability[];
};

export type CompatCheckResult = {
  id: string;
  mode: CompatMode;
  category: string;
  outcome: CompatOutcome;
  detail: string;
};

export type CompatReport = {
  referenceId: string;
  baselineVersion: string | null;
  status: "pass" | "fail";
  localFailed: number;
  livePending: number;
  liveSkipped: number;
  liveFailed: number;
  checks: CompatCheckResult[];
};

function readText(root: string, rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function fileExists(root: string, rel: string): boolean {
  return existsSync(join(root, rel));
}

export function loadReferenceManifest(root: string): ReferenceManifest {
  const path = join(root, REFERENCE_FIXTURE_DIR, REFERENCE_MANIFEST_FILE);
  if (!existsSync(path)) {
    throw new Error(`Missing reference manifest: ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf8")) as ReferenceManifest;
}

function hasLiveCredentials(): boolean {
  return Boolean(
    process.env.FLUX_URL?.trim() &&
      process.env.FLUX_GATEWAY_JWT_SECRET?.trim() &&
      (process.env.FLUX_POSTGREST_SCHEMA?.trim() ||
        process.env.FLUX_POSTGREST_PROFILE?.trim()),
  );
}

function checkAuthFailClosed(root: string): CompatCheckResult {
  const layout = readText(root, "app/(dashboard)/layout.tsx");
  const auth = readText(root, "lib/flux/auth.ts");
  const ok =
    layout.includes("redirect(\"/login\")") &&
    auth.includes("requireSessionSub") &&
    auth.includes("UnauthorizedError");
  return {
    id: "auth-fail-closed",
    mode: "local",
    category: "auth",
    outcome: ok ? "pass" : "fail",
    detail: ok
      ? "dashboard layout redirects unauth; requireSessionSub throws UnauthorizedError"
      : "missing fail-closed auth patterns in dashboard layout / lib/flux/auth.ts",
  };
}

function checkPublicVsProtected(root: string): CompatCheckResult {
  const ok =
    fileExists(root, "app/page.tsx") &&
    fileExists(root, "app/login/page.tsx") &&
    fileExists(root, "app/(dashboard)/layout.tsx") &&
    fileExists(root, "app/(dashboard)/dashboard/page.tsx");
  return {
    id: "public-vs-protected",
    mode: "local",
    category: "routes",
    outcome: ok ? "pass" : "fail",
    detail: ok
      ? "public / and /login present; protected dashboard tree present"
      : "public or protected route files missing",
  };
}

function checkTenantIsolation(root: string): CompatCheckResult {
  const checks = runSecurityInvariants(root);
  const hit = checks.find((c) => c.id === "tenant-rls-jwt-sub");
  const ok = Boolean(hit?.ok);
  return {
    id: "tenant-isolation-rls",
    mode: "local",
    category: "isolation",
    outcome: ok ? "pass" : "fail",
    detail: hit?.detail ?? "tenant-rls-jwt-sub invariant missing",
  };
}

function checkParentChild(root: string): CompatCheckResult {
  const checks = runSecurityInvariants(root);
  const hit = checks.find((c) => c.id === "child-row-parent-ownership");
  const ok = Boolean(hit?.ok);
  return {
    id: "parent-child-ownership",
    mode: "local",
    category: "isolation",
    outcome: ok ? "pass" : "fail",
    detail: hit?.detail ?? "child-row-parent-ownership invariant missing",
  };
}

function checkCrudArchive(root: string): CompatCheckResult {
  const recordsAction = readText(root, "app/(dashboard)/actions/records.ts");
  const notesAction = readText(root, "app/(dashboard)/actions/notes.ts");
  const recordsLib = readText(root, "lib/flux/records.ts");
  const ok =
    recordsAction.includes("createRecordAction") &&
    recordsAction.includes("updateRecordAction") &&
    recordsAction.includes("archiveRecordAction") &&
    recordsAction.includes("archived_at") &&
    notesAction.includes("createNoteAction") &&
    recordsLib.includes("addTag") &&
    recordsLib.includes("removeTag") &&
    recordsLib.includes("listRecords");
  return {
    id: "crud-archive-conventions",
    mode: "local",
    category: "crud",
    outcome: ok ? "pass" : "fail",
    detail: ok
      ? "records/notes/tags create-update-archive conventions present"
      : "missing CRUD/archive conventions in actions or lib/flux/records",
  };
}

function checkServerActionsApi(root: string): CompatCheckResult {
  const recordsAction = readText(root, "app/(dashboard)/actions/records.ts");
  const client = readText(root, "lib/flux/client.ts");
  const apiDir = join(root, "app/api");
  const apiRoutes: string[] = [];
  if (existsSync(apiDir)) {
    const walk = (dir: string) => {
      for (const name of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, name.name);
        if (name.isDirectory()) walk(p);
        else if (name.name === "route.ts") apiRoutes.push(p);
      }
    };
    walk(apiDir);
  }
  const onlyAuthRoute =
    apiRoutes.length === 1 &&
    apiRoutes[0]!.includes(`${join("api", "auth")}`);
  const ok =
    recordsAction.includes("use server") &&
    recordsAction.includes("requireSessionSub") &&
    client.includes("fluxJson") &&
    onlyAuthRoute;
  return {
    id: "server-actions-api-patterns",
    mode: "local",
    category: "access",
    outcome: ok ? "pass" : "fail",
    detail: ok
      ? "server actions + fluxJson boundary; sole API route is Auth.js"
      : "unexpected API routes or missing server-action / fluxJson patterns",
  };
}

function checkValidationErrors(root: string): CompatCheckResult {
  const result = readText(root, "lib/actions/result.ts");
  const recordsAction = readText(root, "app/(dashboard)/actions/records.ts");
  const ok =
    result.includes("FluxHttpError") &&
    result.includes("Request failed. Please try again.") &&
    result.includes("Unauthorized") &&
    recordsAction.includes("z.object") &&
    recordsAction.includes("actionError");
  return {
    id: "validation-safe-errors",
    mode: "local",
    category: "errors",
    outcome: ok ? "pass" : "fail",
    detail: ok
      ? "Zod + actionError sanitization present on record mutations"
      : "validation / safe error handling patterns missing",
  };
}

function checkMigrationsSecurity(root: string): CompatCheckResult {
  const checks = runSecurityInvariants(root);
  const failed = checks.filter((c) => !c.ok);
  return {
    id: "migrations-security-baseline",
    mode: "local",
    category: "security",
    outcome: failed.length === 0 ? "pass" : "fail",
    detail:
      failed.length === 0
        ? `all ${checks.length} security invariants passed`
        : failed.map((c) => `${c.id}: ${c.detail}`).join("; "),
  };
}

function checkEnvConfig(root: string): CompatCheckResult {
  const example = readText(root, ".env.example");
  const required = [
    "AUTH_SECRET",
    "FLUX_URL",
    "FLUX_GATEWAY_JWT_SECRET",
  ];
  const missing = required.filter((k) => !example.includes(k));
  const hasBrowserLeak = /NEXT_PUBLIC_FLUX_/i.test(example);
  const ok = missing.length === 0 && !hasBrowserLeak;
  return {
    id: "env-config-behavior",
    mode: "local",
    category: "config",
    outcome: ok ? "pass" : "fail",
    detail: ok
      ? ".env.example documents Flux/auth secrets without NEXT_PUBLIC_FLUX_*"
      : hasBrowserLeak
        ? ".env.example exposes NEXT_PUBLIC_FLUX_*"
        : `missing keys in .env.example: ${missing.join(", ")}`,
  };
}

function checkNoBrowserSecrets(root: string): CompatCheckResult {
  const checks = runSecurityInvariants(root);
  const raw = checks.find((c) => c.id === "no-raw-flux-fetch");
  const secrets = checks.find((c) => c.id === "no-browser-flux-secrets");
  const ok = Boolean(raw?.ok && secrets?.ok);
  return {
    id: "no-browser-flux-credentials",
    mode: "local",
    category: "security",
    outcome: ok ? "pass" : "fail",
    detail: ok
      ? "no raw Flux fetch outside client.ts; no browser Flux secrets"
      : `${raw?.detail ?? "raw-fetch check missing"}; ${secrets?.detail ?? "secrets check missing"}`,
  };
}

function checkBaselineDrift(
  root: string,
  manifest: ReferenceManifest,
): CompatCheckResult {
  const baseline = readBaselineManifest(root);
  if (!baseline) {
    return {
      id: "baseline-drift-detection",
      mode: "local",
      category: "lifecycle",
      outcome: "fail",
      detail: "foundry.baseline.json missing",
    };
  }
  const securityChecks = runSecurityInvariants(root);
  const report = evaluateBaselineStatus({ root, securityChecks });
  const versionMatch = baseline.baselineVersion === manifest.baselineVersion;
  const ok = report.status === "current" && versionMatch;
  return {
    id: "baseline-drift-detection",
    mode: "local",
    category: "lifecycle",
    outcome: ok ? "pass" : "fail",
    detail: ok
      ? `baseline ${baseline.baselineVersion} status=${report.status}; reference fixture aligned`
      : !versionMatch
        ? `reference fixture baselineVersion ${manifest.baselineVersion} != manifest ${baseline.baselineVersion}`
        : `foundry:status is ${report.status} (expected current)`,
  };
}

const localCheckers: Record<
  string,
  (root: string, manifest: ReferenceManifest) => CompatCheckResult
> = {
  "auth-fail-closed": (root) => checkAuthFailClosed(root),
  "public-vs-protected": (root) => checkPublicVsProtected(root),
  "tenant-isolation-rls": (root) => checkTenantIsolation(root),
  "parent-child-ownership": (root) => checkParentChild(root),
  "crud-archive-conventions": (root) => checkCrudArchive(root),
  "server-actions-api-patterns": (root) => checkServerActionsApi(root),
  "validation-safe-errors": (root) => checkValidationErrors(root),
  "migrations-security-baseline": (root) => checkMigrationsSecurity(root),
  "env-config-behavior": (root) => checkEnvConfig(root),
  "no-browser-flux-credentials": (root) => checkNoBrowserSecrets(root),
  "baseline-drift-detection": (root, manifest) =>
    checkBaselineDrift(root, manifest),
};

async function runLiveCapability(
  cap: ReferenceCapability,
  liveEnabled: boolean,
): Promise<CompatCheckResult> {
  const base = {
    id: cap.id,
    mode: "live" as const,
    category: cap.category,
  };

  if (cap.pendingReason || cap.category === "flux-core-pending") {
    if (cap.id === "live-unauth-gateway-contract" && liveEnabled && hasLiveCredentials()) {
      // Observe only — do not treat gateway response as Foundry pass/fail.
      try {
        const probe = await probeUnauthenticatedProfiles();
        return {
          ...base,
          outcome: "pending",
          detail: `Flux-core pending (observed unauth /profiles → HTTP ${probe.status}). ${cap.pendingReason}`,
        };
      } catch (e) {
        return {
          ...base,
          outcome: "pending",
          detail: `Flux-core pending (probe error: ${e instanceof Error ? e.message : String(e)}). ${cap.pendingReason}`,
        };
      }
    }
    return {
      ...base,
      outcome: "pending",
      detail: cap.pendingReason ?? "pending Flux-core contract",
    };
  }

  if (!liveEnabled) {
    return {
      ...base,
      outcome: "skipped",
      detail: "live mode off — run with --live / FOUNDRY_COMPAT_LIVE=1 when credentials exist",
    };
  }

  if (!hasLiveCredentials()) {
    return {
      ...base,
      outcome: "skipped",
      detail: `missing credentials: ${(cap.requires ?? ["FLUX_URL", "FLUX_GATEWAY_JWT_SECRET", "FLUX_POSTGREST_SCHEMA"]).join(", ")}`,
    };
  }

  if (cap.id === "live-authenticated-bridge") {
    const probe = await probeAuthenticatedBridge("foundry-compat-probe");
    return {
      ...base,
      outcome: probe.ok ? "pass" : "fail",
      detail: probe.detail,
    };
  }

  return {
    ...base,
    outcome: "pending",
    detail: "no live runner registered for this capability",
  };
}

export async function runReferenceCompat(options: {
  root: string;
  live?: boolean;
}): Promise<CompatReport> {
  const { root } = options;
  const liveEnabled =
    Boolean(options.live) || process.env.FOUNDRY_COMPAT_LIVE === "1";
  const manifest = loadReferenceManifest(root);

  for (const doc of manifest.docs) {
    if (!fileExists(root, doc)) {
      throw new Error(`Reference docs missing: ${doc}`);
    }
  }

  const checks: CompatCheckResult[] = [];

  for (const cap of manifest.capabilities) {
    if (cap.mode === "local") {
      const checker = localCheckers[cap.id];
      if (!checker) {
        checks.push({
          id: cap.id,
          mode: "local",
          category: cap.category,
          outcome: "fail",
          detail: "no local checker registered",
        });
        continue;
      }
      checks.push(checker(root, manifest));
      continue;
    }
    checks.push(await runLiveCapability(cap, liveEnabled));
  }

  const localFailed = checks.filter(
    (c) => c.mode === "local" && c.outcome === "fail",
  ).length;
  const liveFailed = checks.filter(
    (c) => c.mode === "live" && c.outcome === "fail",
  ).length;
  const livePending = checks.filter((c) => c.outcome === "pending").length;
  const liveSkipped = checks.filter(
    (c) => c.mode === "live" && c.outcome === "skipped",
  ).length;

  // Local failures always fail the harness. Live failures only count when live is enabled.
  const status =
    localFailed > 0 || (liveEnabled && liveFailed > 0) ? "fail" : "pass";

  return {
    referenceId: manifest.id,
    baselineVersion: readBaselineManifest(root)?.baselineVersion ?? null,
    status,
    localFailed,
    livePending,
    liveSkipped,
    liveFailed,
    checks,
  };
}

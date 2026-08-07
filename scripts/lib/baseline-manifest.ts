/**
 * Foundry baseline manifest load, fingerprinting, and status evaluation.
 * Non-destructive — never overwrites application files.
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { execSync } from "node:child_process";

export const BASELINE_MANIFEST_FILE = "foundry.baseline.json";

export type BaselineStatusKind =
  | "current"
  | "behind"
  | "locally_customized"
  | "missing_security"
  | "unknown";

export type FoundryBaselineManifest = {
  schemaVersion: number;
  baselineVersion: string;
  releasedAt?: string;
  name: string;
  source: {
    repository: string;
    commit: string;
    ref?: string;
  };
  fluxSurface: {
    contracts: string[];
    note: string;
  };
  requiredScripts: string[];
  requiredPaths: string[];
  fingerprintGlobs: string[];
  securityBaseline: {
    requiredMigrations: string[];
    invariants: string[];
  };
  fingerprints: Record<string, string>;
};

export type StatusFinding = {
  code: string;
  severity: "info" | "warn" | "error";
  message: string;
  remediation?: string;
};

export type BaselineStatusReport = {
  status: BaselineStatusKind;
  baselineVersion: string | null;
  sourceCommit: string | null;
  findings: StatusFinding[];
  fingerprint: {
    expected: number;
    matched: number;
    missing: string[];
    changed: string[];
    unexpected: string[];
  };
  reference?: { baselineVersion: string; commit: string };
};

function walkFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === ".git") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkFiles(p));
    else out.push(p);
  }
  return out;
}

/** Minimal glob: `**` / `*` only, anchored at repo root. */
export function matchGlob(relPath: string, glob: string): boolean {
  const norm = relPath.replace(/\\/g, "/");
  const g = glob.replace(/\\/g, "/");
  const esc = g
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "<<<DS>>>")
    .replace(/\*/g, "[^/]*")
    .replace(/<<<DS>>>/g, ".*");
  return new RegExp(`^${esc}$`).test(norm);
}

export function resolveFingerprintPaths(root: string, globs: string[]): string[] {
  const all = walkFiles(root).map((abs) => relative(root, abs).replace(/\\/g, "/"));
  const matched = all.filter((rel) => globs.some((g) => matchGlob(rel, g)));
  return [...new Set(matched)].sort();
}

export function hashFile(absPath: string): string {
  const buf = readFileSync(absPath);
  return createHash("sha256").update(buf).digest("hex");
}

export function computeFingerprints(
  root: string,
  globs: string[],
): Record<string, string> {
  const paths = resolveFingerprintPaths(root, globs);
  const out: Record<string, string> = {};
  for (const rel of paths) {
    out[rel] = hashFile(join(root, rel));
  }
  return out;
}

export function readBaselineManifest(
  root: string,
): FoundryBaselineManifest | null {
  const path = join(root, BASELINE_MANIFEST_FILE);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as FoundryBaselineManifest;
}

export function writeBaselineManifest(
  root: string,
  manifest: FoundryBaselineManifest,
): void {
  const path = join(root, BASELINE_MANIFEST_FILE);
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

export function gitHeadCommit(root: string): string | null {
  try {
    return execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function parseSemver(v: string): [number, number, number] | null {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(v.trim());
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return a.localeCompare(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i]! < pb[i]! ? -1 : 1;
  }
  return 0;
}

export type SecurityCheck = { id: string; ok: boolean; detail: string };

export function evaluateBaselineStatus(opts: {
  root: string;
  securityChecks: SecurityCheck[];
  reference?: FoundryBaselineManifest | null;
}): BaselineStatusReport {
  const { root, securityChecks, reference } = opts;
  const findings: StatusFinding[] = [];
  const manifest = readBaselineManifest(root);

  if (!manifest) {
    return {
      status: "unknown",
      baselineVersion: null,
      sourceCommit: null,
      findings: [
        {
          code: "missing-manifest",
          severity: "warn",
          message: `${BASELINE_MANIFEST_FILE} is missing (legacy / unmanaged fork)`,
          remediation:
            "Copy foundry.baseline.json from upstream Foundry and re-run pnpm foundry:status. Do not invent Flux-core versions.",
        },
      ],
      fingerprint: {
        expected: 0,
        matched: 0,
        missing: [],
        changed: [],
        unexpected: [],
      },
      reference: reference
        ? {
            baselineVersion: reference.baselineVersion,
            commit: reference.source.commit,
          }
        : undefined,
    };
  }

  for (const rel of manifest.requiredPaths) {
    if (!existsSync(join(root, rel))) {
      findings.push({
        code: "missing-required-path",
        severity: "error",
        message: `Missing required path: ${rel}`,
        remediation: `Restore ${rel} from upstream Foundry baseline ${manifest.baselineVersion}.`,
      });
    }
  }

  const pkgPath = join(root, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
      scripts?: Record<string, string>;
    };
    for (const name of manifest.requiredScripts) {
      if (!pkg.scripts?.[name]) {
        findings.push({
          code: "missing-script",
          severity: "error",
          message: `package.json missing script "${name}"`,
          remediation: `Add the Foundry script "${name}" from upstream package.json.`,
        });
      }
    }
  }

  const actual = computeFingerprints(root, manifest.fingerprintGlobs);
  const expected = manifest.fingerprints ?? {};
  const expectedKeys = Object.keys(expected).sort();
  const actualKeys = Object.keys(actual).sort();
  const missing = expectedKeys.filter((k) => !(k in actual));
  const unexpected = actualKeys.filter((k) => !(k in expected));
  const changed = expectedKeys.filter(
    (k) => k in actual && actual[k] !== expected[k],
  );
  const matched = expectedKeys.length - missing.length - changed.length;

  for (const rel of missing) {
    findings.push({
      code: "fingerprint-missing",
      severity: "warn",
      message: `Owned baseline file missing: ${rel}`,
      remediation: `Restore ${rel} from upstream or re-stamp only if you maintain Foundry itself.`,
    });
  }
  for (const rel of changed) {
    findings.push({
      code: "fingerprint-changed",
      severity: "warn",
      message: `Owned baseline file customized: ${rel}`,
      remediation:
        "Review the diff against upstream. Prefer merging Foundry-owned paths; keep domain changes outside fingerprintGlobs.",
    });
  }

  const failedSecurity = securityChecks.filter((c) => !c.ok);
  for (const c of failedSecurity) {
    findings.push({
      code: `security:${c.id}`,
      severity: "error",
      message: c.detail,
      remediation:
        "Restore security migrations/invariants from upstream Foundry. Never weaken RLS to make tests pass.",
    });
  }

  let status: BaselineStatusKind = "current";
  if (failedSecurity.length > 0) {
    status = "missing_security";
  } else if (
    reference &&
    compareSemver(manifest.baselineVersion, reference.baselineVersion) < 0
  ) {
    status = "behind";
    findings.push({
      code: "baseline-behind",
      severity: "warn",
      message: `App baseline ${manifest.baselineVersion} is behind reference ${reference.baselineVersion}`,
      remediation:
        "Sync Foundry-owned paths from upstream (contracts, lib/flux, scripts, CI, security migrations), then update foundry.baseline.json. Do not blind-overwrite app-owned files.",
    });
  } else if (
    missing.length > 0 ||
    changed.length > 0 ||
    findings.some((f) => f.code === "missing-script" || f.code === "missing-required-path")
  ) {
    status = "locally_customized";
  }

  return {
    status,
    baselineVersion: manifest.baselineVersion,
    sourceCommit: manifest.source.commit,
    findings,
    fingerprint: {
      expected: expectedKeys.length,
      matched: Math.max(0, matched),
      missing,
      changed,
      unexpected,
    },
    reference: reference
      ? {
          baselineVersion: reference.baselineVersion,
          commit: reference.source.commit,
        }
      : undefined,
  };
}

export function ensureParentDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    throw new Error(`Directory missing: ${dir}`);
  }
}

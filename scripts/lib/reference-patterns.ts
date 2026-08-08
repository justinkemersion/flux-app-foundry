/**
 * Pattern-anchor map for fixtures/reference-app (template file existence canary).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runSecurityInvariants } from "./security-invariants";

export type ReferencePattern = {
  id: string;
  description: string;
  anchors: string[];
  note?: string;
};

export type ReferencePatternsManifest = {
  schemaVersion: number;
  name: string;
  role: string;
  notProduction: boolean;
  baselineVersion: string;
  mediaUpload?: string;
  patterns: ReferencePattern[];
};

export const REFERENCE_FIXTURE_DIR = "fixtures/reference-app";
export const REFERENCE_PATTERNS_FILE = "patterns.json";

export const REFERENCE_LAYOUT_FILES = [
  "README.md",
  "manifest.json",
  REFERENCE_PATTERNS_FILE,
  "domain/session.ts",
  "domain/ownership.ts",
  "domain/archive.ts",
  "domain/validation.ts",
  "domain/public-routes.ts",
  "domain/actions.ts",
  "negative/browser-flux-bad.fixture.ts.txt",
  "negative/cross-tenant-child.fixture.sql.txt",
  "security/0004_vulnerable_child.sql.txt",
  "security/0021_parent_ownership_renumbered.sql.txt",
  "security/0007_owner_user_id_ownership.sql.txt",
  "security/0009_helper_delegated_ownership.sql.txt",
  "security/client-flux-fetch.fixture.ts.txt",
  "security/open-meteo-fetch.fixture.ts.txt",
  "security/nws-fetch.fixture.ts.txt",
  "security/workers-ai-fetch.fixture.ts.txt",
  "security/workers-ai-leaks-flux.fixture.ts.txt",
] as const;

export function readReferencePatterns(root: string): ReferencePatternsManifest {
  const path = join(root, REFERENCE_FIXTURE_DIR, REFERENCE_PATTERNS_FILE);
  if (!existsSync(path)) {
    throw new Error(`Missing reference patterns: ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf8")) as ReferencePatternsManifest;
}

export function assertReferenceFixtureLayout(root: string): string[] {
  return REFERENCE_LAYOUT_FILES.filter(
    (rel) => !existsSync(join(root, REFERENCE_FIXTURE_DIR, rel)),
  ).map((rel) => `${REFERENCE_FIXTURE_DIR}/${rel}`);
}

/**
 * Anchors prefixed with `capability:` are satisfied by a passing security
 * invariant rather than by a file at a fixed path. Security properties are
 * Foundry-owned; the migration files that implement them are not.
 */
export const CAPABILITY_ANCHOR_PREFIX = "capability:";

export function assertReferencePatternAnchors(root: string): string[] {
  const manifest = readReferencePatterns(root);
  const missing: string[] = [];
  if (manifest.role !== "compatibility-canary" || !manifest.notProduction) {
    missing.push(
      "patterns.json must declare compatibility-canary / notProduction",
    );
  }

  const needsCapabilities = manifest.patterns.some((p) =>
    p.anchors.some((a) => a.startsWith(CAPABILITY_ANCHOR_PREFIX)),
  );
  const checks = needsCapabilities ? runSecurityInvariants(root) : [];

  for (const pattern of manifest.patterns) {
    for (const anchor of pattern.anchors) {
      if (anchor.startsWith(CAPABILITY_ANCHOR_PREFIX)) {
        const id = anchor.slice(CAPABILITY_ANCHOR_PREFIX.length);
        const hit = checks.find((c) => c.id === id);
        if (!hit) {
          missing.push(`${pattern.id}: unknown capability ${id}`);
        } else if (hit.status === "fail") {
          missing.push(`${pattern.id}: capability ${id} failed — ${hit.detail}`);
        }
        continue;
      }
      if (!existsSync(join(root, anchor))) {
        missing.push(`${pattern.id}: missing anchor ${anchor}`);
      }
    }
  }
  return missing;
}

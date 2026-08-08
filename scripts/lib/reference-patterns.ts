/**
 * Pattern-anchor map for fixtures/reference-app (template file existence canary).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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

export function assertReferencePatternAnchors(root: string): string[] {
  const manifest = readReferencePatterns(root);
  const missing: string[] = [];
  if (manifest.role !== "compatibility-canary" || !manifest.notProduction) {
    missing.push(
      "patterns.json must declare compatibility-canary / notProduction",
    );
  }
  for (const pattern of manifest.patterns) {
    for (const anchor of pattern.anchors) {
      if (!existsSync(join(root, anchor))) {
        missing.push(`${pattern.id}: missing anchor ${anchor}`);
      }
    }
  }
  return missing;
}

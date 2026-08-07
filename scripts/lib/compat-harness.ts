/**
 * Shared helpers for pnpm foundry:compat (local pattern canary).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runSecurityInvariants } from "./security-invariants";

export type CompatPattern = {
  id: string;
  description: string;
  anchors: string[];
  note?: string;
};

export type CompatPatternsManifest = {
  schemaVersion: number;
  name: string;
  role: string;
  notProduction: boolean;
  patterns: CompatPattern[];
};

export const COMPAT_ROOT = "_compat";
export const REFERENCE_APP = join(COMPAT_ROOT, "reference-app");
export const PATTERNS_PATH = join(REFERENCE_APP, "patterns.json");

export function readPatternsManifest(root: string): CompatPatternsManifest {
  const path = join(root, PATTERNS_PATH);
  if (!existsSync(path)) {
    throw new Error(`missing ${PATTERNS_PATH}`);
  }
  return JSON.parse(readFileSync(path, "utf8")) as CompatPatternsManifest;
}

export function assertReferenceAppLayout(root: string): string[] {
  const required = [
    join(COMPAT_ROOT, "README.md"),
    join(REFERENCE_APP, "PURPOSE.md"),
    PATTERNS_PATH,
    join(REFERENCE_APP, "domain/session.ts"),
    join(REFERENCE_APP, "domain/ownership.ts"),
    join(REFERENCE_APP, "domain/archive.ts"),
    join(REFERENCE_APP, "domain/validation.ts"),
    join(REFERENCE_APP, "domain/public-routes.ts"),
    join(REFERENCE_APP, "domain/actions.ts"),
    join(REFERENCE_APP, "fixtures/negative/browser-flux-bad.fixture.ts.txt"),
    join(REFERENCE_APP, "fixtures/negative/cross-tenant-child.fixture.sql.txt"),
    join(REFERENCE_APP, "live/probe-contract.ts"),
    join(COMPAT_ROOT, "tests/patterns.compat.test.ts"),
  ];
  return required.filter((p) => !existsSync(join(root, p)));
}

export function assertPatternAnchors(root: string): string[] {
  const manifest = readPatternsManifest(root);
  const missing: string[] = [];
  if (manifest.role !== "compatibility-canary" || !manifest.notProduction) {
    missing.push("patterns.json must declare compatibility-canary / notProduction");
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

export function runCompatSecurity(root: string) {
  return runSecurityInvariants(root);
}

/** Detect browser-Flux anti-patterns in a source string (for negative fixtures). */
export function detectBrowserFluxViolations(src: string): string[] {
  const hits: string[] = [];
  if (/NEXT_PUBLIC_FLUX_/i.test(src)) hits.push("NEXT_PUBLIC_FLUX_*");
  if (/"use client"/.test(src) && /fetch\s*\(/.test(src)) {
    hits.push("client-module-fetch");
  }
  return hits;
}

/** Detect missing parent-ownership in a policy SQL fragment. */
export function detectMissingParentOwnership(sql: string): boolean {
  const lower = sql.toLowerCase();
  const hasPolicy = lower.includes("create policy");
  const hasParentExists =
    lower.includes("exists (") &&
    lower.includes("from records") &&
    lower.includes("record_id");
  return hasPolicy && !hasParentExists;
}

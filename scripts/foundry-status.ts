#!/usr/bin/env tsx
/**
 * Non-destructive Foundry baseline / drift report.
 *
 * Usage:
 *   pnpm foundry:status
 *   pnpm foundry:status --reference /path/to/upstream/foundry.baseline.json
 *   pnpm foundry:status --json
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  evaluateBaselineStatus,
  readBaselineManifest,
  type FoundryBaselineManifest,
} from "./lib/baseline-manifest";
import { runSecurityInvariants } from "./lib/security-invariants";

const root = process.cwd();
const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
const refIdx = args.indexOf("--reference");
const refPath = refIdx >= 0 ? args[refIdx + 1] : undefined;

function loadReference(path: string | undefined): FoundryBaselineManifest | null {
  if (!path) return null;
  const abs = resolve(root, path);
  if (!existsSync(abs)) {
    console.error(`Reference manifest not found: ${abs}`);
    process.exit(2);
  }
  return JSON.parse(readFileSync(abs, "utf8")) as FoundryBaselineManifest;
}

const reference = loadReference(refPath);
const securityChecks = runSecurityInvariants(root);
const report = evaluateBaselineStatus({ root, securityChecks, reference });

const exitByStatus: Record<string, number> = {
  current: 0,
  locally_customized: 1,
  behind: 1,
  missing_security: 1,
  unknown: 1,
};

if (jsonMode) {
  console.log(
    JSON.stringify(
      {
        ...report,
        securityChecks,
        manifestPresent: Boolean(readBaselineManifest(root)),
      },
      null,
      2,
    ),
  );
} else {
  console.log("Foundry baseline status");
  console.log("=======================");
  console.log(`status:           ${report.status}`);
  console.log(`baselineVersion:  ${report.baselineVersion ?? "(none)"}`);
  console.log(`sourceCommit:     ${report.sourceCommit ?? "(none)"}`);
  if (report.reference) {
    console.log(
      `reference:        ${report.reference.baselineVersion} @ ${report.reference.commit}`,
    );
  }
  console.log(
    `fingerprints:     ${report.fingerprint.matched}/${report.fingerprint.expected} matched` +
      (report.fingerprint.changed.length
        ? `, ${report.fingerprint.changed.length} changed`
        : "") +
      (report.fingerprint.missing.length
        ? `, ${report.fingerprint.missing.length} missing`
        : ""),
  );
  console.log("\nSecurity invariants");
  const glyph = { pass: "✓", fail: "✗", unknown: "?" } as const;
  for (const c of securityChecks) {
    console.log(`${glyph[c.status]} ${c.id}: ${c.detail}`);
    if (c.status !== "pass") {
      for (const note of c.notes ?? []) console.log(`    · ${note}`);
    }
  }
  if (report.findings.length > 0) {
    console.log("\nFindings");
    for (const f of report.findings) {
      console.log(`- [${f.severity}] ${f.message}`);
      if (f.remediation) console.log(`    → ${f.remediation}`);
    }
  } else {
    console.log("\nNo drift findings.");
  }
  console.log(
    "\nThis command never overwrites app files. Sync Foundry-owned paths deliberately.",
  );
}

process.exit(exitByStatus[report.status] ?? 1);

#!/usr/bin/env tsx
/**
 * Foundry compatibility canary — validates the reference app + baseline patterns.
 *
 * Local (default): no Flux credentials.
 * Live: FOUNDRY_COMPAT_LIVE=1 with safe test credentials (see _compat/README.md).
 *
 * Complements foundry:golden-app; does not replace it.
 */
import { execSync } from "node:child_process";
import { join } from "node:path";
import {
  assertPatternAnchors,
  assertReferenceAppLayout,
  runCompatSecurity,
} from "./lib/compat-harness";
import {
  liveProbePassed,
  runLiveProbeContract,
} from "../_compat/reference-app/live/probe-contract";

const root = process.cwd();

function run(cmd: string) {
  console.log(`\n→ ${cmd}\n`);
  execSync(cmd, { cwd: root, stdio: "inherit", env: process.env });
}

console.log("Foundry compatibility harness (local pattern canary)\n");

const missingLayout = assertReferenceAppLayout(root);
if (missingLayout.length) {
  console.error("Reference app layout incomplete:\n" + missingLayout.join("\n"));
  process.exit(1);
}
console.log("✓ reference app layout");

const missingAnchors = assertPatternAnchors(root);
if (missingAnchors.length) {
  console.error("Pattern anchors missing:\n" + missingAnchors.join("\n"));
  process.exit(1);
}
console.log("✓ pattern anchors present");

const security = runCompatSecurity(root);
const failed = security.filter((c) => !c.ok);
for (const c of security) {
  console.log(`${c.ok ? "✓" : "✗"} ${c.id}: ${c.detail}`);
}
if (failed.length) {
  console.error("\nSecurity invariants failed.");
  process.exit(1);
}

run(
  `pnpm exec vitest run ${join("_compat", "tests")} --reporter=dot`,
);

const live = await runLiveProbeContract();
if (live.skipped) {
  console.log(`\n○ live probes skipped — ${live.reason}`);
} else if (!liveProbePassed(live)) {
  console.error("\nLive probe contract failed:");
  if (live.reason) console.error(`  ${live.reason}`);
  for (const p of live.probes) {
    console.error(`  ${p.id}: ${p.result.ok ? "ok" : "FAIL"} ${p.result.detail}`);
  }
  console.error(
    "\nCross-repo note: gateway bridge / Flux-core gaps are not fixed with local shims.",
  );
  process.exit(1);
} else {
  console.log("\n✓ live probe contract");
  for (const p of live.probes) {
    console.log(`  ${p.id}: ${p.result.detail}`);
  }
}

console.log("\nCompatibility harness passed (local).");
console.log("Companion gates: pnpm foundry:verify:template, pnpm foundry:golden-app");

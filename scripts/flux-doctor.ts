#!/usr/bin/env tsx
/**
 * Flux platform + gateway preflight before product work or SQL migrations.
 * See _contract/flux-workflow.md and docs/FLUX_WORKFLOW.md.
 */
import { runFluxDoctorChecks } from "./lib/flux-doctor-checks";
import { loadEnvFiles } from "./lib/load-env";

const root = process.cwd();
loadEnvFiles(root);

async function main() {
  const checks = await runFluxDoctorChecks(root);
  const failed = checks.filter((c) => !c.ok);

  for (const c of checks) {
    console.log(`${c.ok ? "✓" : "✗"} ${c.name}: ${c.detail}`);
  }

  if (failed.length > 0) {
    console.error(`\n${failed.length} Flux check(s) failed.`);
    console.error("See docs/FLUX_WORKFLOW.md — create Flux project before SQL, then flux push sql/migrations/ → flux:schema:sync.");
    process.exit(1);
  }

  console.log("\nAll Flux doctor checks passed.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

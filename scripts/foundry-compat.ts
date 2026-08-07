#!/usr/bin/env tsx
/**
 * Canonical reference-app compatibility harness.
 *
 *   pnpm foundry:compat
 *   pnpm foundry:compat --live
 *   pnpm foundry:compat --json
 *
 * Local checks are deterministic and run offline/CI.
 * Live Flux probes are opt-in and never invent Flux-core success.
 */
import { runReferenceCompat } from "./lib/reference-compat";

async function main() {
  const root = process.cwd();
  const args = process.argv.slice(2);
  const jsonMode = args.includes("--json");
  const live =
    args.includes("--live") || process.env.FOUNDRY_COMPAT_LIVE === "1";

  const report = await runReferenceCompat({ root, live });

  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log("Foundry reference compatibility");
    console.log("==============================");
    console.log(`reference:        ${report.referenceId}`);
    console.log(`baselineVersion:  ${report.baselineVersion ?? "(none)"}`);
    console.log(`live mode:        ${live ? "on" : "off"}`);
    console.log(`result:           ${report.status}`);
    console.log("");
    console.log("Checks");
    for (const c of report.checks) {
      const mark =
        c.outcome === "pass"
          ? "✓"
          : c.outcome === "fail"
            ? "✗"
            : c.outcome === "pending"
              ? "…"
              : "-";
      console.log(`${mark} [${c.mode}/${c.outcome}] ${c.id}: ${c.detail}`);
    }
    console.log("");
    console.log(
      `summary: localFailed=${report.localFailed} liveFailed=${report.liveFailed} livePending=${report.livePending} liveSkipped=${report.liveSkipped}`,
    );
    if (!live) {
      console.log(
        "Tip: pass --live (and Flux credentials) to exercise opt-in live probes. Flux-core pending items stay pending.",
      );
    }
    console.log(
      "See docs/REFERENCE_APP.md for coverage vs deferred Flux-core contracts.",
    );
  }

  process.exit(report.status === "pass" ? 0 : 1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

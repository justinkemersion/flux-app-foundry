import { describe, expect, it } from "vitest";
import {
  loadReferenceManifest,
  runReferenceCompat,
  REFERENCE_FIXTURE_DIR,
} from "@/scripts/lib/reference-compat";
import { readBaselineManifest } from "@/scripts/lib/baseline-manifest";
import { existsSync } from "node:fs";
import { join } from "node:path";

describe("Foundry reference compatibility harness", () => {
  const root = process.cwd();

  it("loads the canonical reference fixture manifest", () => {
    const manifest = loadReferenceManifest(root);
    expect(manifest.id).toBe("foundry-reference-app");
    expect(manifest.capabilities.length).toBeGreaterThanOrEqual(10);
    expect(manifest.capabilities.every((c) => c.id && c.mode)).toBe(true);
    expect(existsSync(join(root, REFERENCE_FIXTURE_DIR, "README.md"))).toBe(
      true,
    );
  });

  it("aligns fixture baselineVersion with foundry.baseline.json", () => {
    const manifest = loadReferenceManifest(root);
    const baseline = readBaselineManifest(root);
    expect(baseline).not.toBeNull();
    expect(manifest.baselineVersion).toBe(baseline?.baselineVersion);
  });

  it("passes deterministic local checks offline", async () => {
    const report = await runReferenceCompat({ root, live: false });
    expect(report.status).toBe("pass");
    expect(report.localFailed).toBe(0);

    const local = report.checks.filter((c) => c.mode === "local");
    expect(local.length).toBeGreaterThan(0);
    for (const c of local) {
      expect(c.outcome, `${c.id}: ${c.detail}`).toBe("pass");
    }

    const pending = report.checks.filter((c) => c.outcome === "pending");
    expect(pending.some((c) => c.id === "live-jwt-bridging-semantics")).toBe(
      true,
    );
    expect(pending.some((c) => c.id === "live-schema-rewrite-v2")).toBe(true);

    const skippedLive = report.checks.filter(
      (c) => c.mode === "live" && c.outcome === "skipped",
    );
    expect(skippedLive.some((c) => c.id === "live-authenticated-bridge")).toBe(
      true,
    );
  });
});

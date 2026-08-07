import { describe, expect, it } from "vitest";
import { runSecurityInvariants } from "@/scripts/lib/security-invariants";
import {
  evaluateBaselineStatus,
  readBaselineManifest,
} from "@/scripts/lib/baseline-manifest";

describe("Foundry security invariants", () => {
  it("passes on the current Foundry tree", () => {
    const checks = runSecurityInvariants(process.cwd());
    for (const c of checks) {
      expect(c.ok, `${c.id}: ${c.detail}`).toBe(true);
    }
  });
});

describe("Foundry baseline manifest", () => {
  it("is present and evaluates current when fingerprints match", () => {
    const manifest = readBaselineManifest(process.cwd());
    expect(manifest).not.toBeNull();
    expect(manifest?.baselineVersion).toMatch(/^\d+\.\d+\.\d+/);
    expect(manifest?.fluxSurface.contracts).toContain("_contract/flux.md");

    const report = evaluateBaselineStatus({
      root: process.cwd(),
      securityChecks: runSecurityInvariants(process.cwd()),
    });
    expect(report.status).toBe("current");
  });

  it("reports unknown when manifest is absent", () => {
    const report = evaluateBaselineStatus({
      root: "/tmp",
      securityChecks: [],
    });
    expect(report.status).toBe("unknown");
  });
});

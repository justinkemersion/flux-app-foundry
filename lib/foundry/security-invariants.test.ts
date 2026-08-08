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
      expect(c.status, `${c.id}: ${c.detail}`).toBe("pass");
    }
  });

  it("declares every capability the manifest requires", () => {
    const manifest = readBaselineManifest(process.cwd());
    const ids = new Set(runSecurityInvariants(process.cwd()).map((c) => c.id));
    for (const id of manifest?.securityBaseline.invariants ?? []) {
      expect(ids, `manifest lists invariant ${id}`).toContain(id);
    }
  });

  it("does not require any specific migration filename", () => {
    const manifest = readBaselineManifest(process.cwd());
    const required = manifest?.requiredPaths ?? [];
    expect(required.filter((p) => p.startsWith("sql/migrations/"))).toEqual([]);
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

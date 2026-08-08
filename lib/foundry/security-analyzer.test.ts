/**
 * Regression coverage for the semantic security analyzer.
 *
 * Every case below is a pattern the fleet audit actually produced. The point
 * of these tests is that vulnerable and protected shapes are *distinguishable*
 * without relying on migration filenames or ownership column spellings.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateSqlSecurity } from "@/scripts/lib/security-invariants";
import { buildSqlModel, ownershipColumns } from "@/scripts/lib/sql-policy-analysis";
import { classifyFluxAccess } from "@/scripts/lib/flux-access-analysis";

const DIR = join(process.cwd(), "fixtures/reference-app/security");

function fixture(name: string): string {
  return readFileSync(join(DIR, name), "utf8");
}

/** Build a model from fixture files, applied in the order given. */
function modelOf(...names: string[]) {
  return buildSqlModel(
    names.map((file) => ({ file, sql: fixture(file) })),
  );
}

function statusOf(names: string[], id: string): string {
  const checks = evaluateSqlSecurity(modelOf(...names));
  const hit = checks.find((c) => c.id === id);
  if (!hit) throw new Error(`invariant ${id} not produced`);
  return hit.status;
}

function fluxViolations(name: string, opts: { browserReachable: boolean }) {
  return classifyFluxAccess({
    relPath: `fixtures/${name}`,
    src: fixture(name),
    isBoundary: false,
    browserReachable: opts.browserReachable,
  });
}

describe("parent ownership is judged by policy shape, not filename", () => {
  it("case 1: child policy checking only its own user_id fails", () => {
    expect(statusOf(["0004_vulnerable_child.sql.txt"], "child-row-parent-ownership")).toBe(
      "fail",
    );
  });

  it("case 2: EXISTS against the parent passes", () => {
    const status = statusOf(
      ["0004_vulnerable_child.sql.txt", "0021_parent_ownership_renumbered.sql.txt"],
      "child-row-parent-ownership",
    );
    expect(status).toBe("pass");
  });

  it("case 3: the fix is accepted at an arbitrary migration number", () => {
    // Same content, deliberately not numbered 0006.
    const names = [
      "0004_vulnerable_child.sql.txt",
      "0021_parent_ownership_renumbered.sql.txt",
    ];
    expect(names.some((n) => n.includes("0006"))).toBe(false);
    expect(statusOf(names, "child-row-parent-ownership")).toBe("pass");
  });

  it("case 9: unresolvable ownership helper is reported for review, never passed", () => {
    expect(
      statusOf(["0009_helper_delegated_ownership.sql.txt"], "child-row-parent-ownership"),
    ).toBe("unknown");
  });
});

describe("ownership column naming is discovered, not hard-coded", () => {
  it("case 4: owner_user_id satisfies both SQL invariants", () => {
    const names = ["0007_owner_user_id_ownership.sql.txt"];
    expect(statusOf(names, "tenant-rls-jwt-sub")).toBe("pass");
    expect(statusOf(names, "child-row-parent-ownership")).toBe("pass");
  });

  it("discovers the ownership column from the comparison itself", () => {
    const model = modelOf("0007_owner_user_id_ownership.sql.txt");
    const policy = model.policies.find((p) => p.name === "recipe_families_select");
    expect(policy).toBeDefined();
    expect([...ownershipColumns(policy!.body)]).toEqual(["owner_user_id"]);
  });
});

describe("Flux access detection is evidence-based", () => {
  it("case 5: a client component fetching the Flux API fails", () => {
    const hits = fluxViolations("client-flux-fetch.fixture.ts.txt", {
      browserReachable: true,
    });
    expect(hits.map((h) => h.kind)).toContain("browser-flux-access");
  });

  it("case 6: Open-Meteo from a client component is not a Flux violation", () => {
    const hits = fluxViolations("open-meteo-fetch.fixture.ts.txt", {
      browserReachable: true,
    });
    expect(hits).toEqual([]);
  });

  it("case 7: NWS from server code is not a Flux violation", () => {
    const hits = fluxViolations("nws-fetch.fixture.ts.txt", { browserReachable: false });
    expect(hits).toEqual([]);
  });

  it("case 8a: Workers AI with its own credential is not a Flux violation", () => {
    const hits = fluxViolations("workers-ai-fetch.fixture.ts.txt", {
      browserReachable: false,
    });
    expect(hits).toEqual([]);
  });

  it("case 8b: Workers AI that carries a Flux credential off-boundary fails", () => {
    const hits = fluxViolations("workers-ai-leaks-flux.fixture.ts.txt", {
      browserReachable: false,
    });
    expect(hits.map((h) => h.kind)).toContain("flux-fetch-outside-boundary");
  });
});

describe("audit patterns from the fleet sweep are distinguishable", () => {
  it("a vulnerable child-write pattern and a protected one differ", () => {
    const vulnerable = statusOf(
      ["0004_vulnerable_child.sql.txt"],
      "child-row-parent-ownership",
    );
    const protectedStatus = statusOf(
      ["0004_vulnerable_child.sql.txt", "0021_parent_ownership_renumbered.sql.txt"],
      "child-row-parent-ownership",
    );
    expect(vulnerable).toBe("fail");
    expect(protectedStatus).toBe("pass");
    expect(vulnerable).not.toBe(protectedStatus);
  });

  it("no invariant is keyed to migration number 0006", () => {
    for (const rel of [
      "scripts/lib/security-invariants.ts",
      "scripts/lib/sql-policy-analysis.ts",
      "scripts/lib/flux-access-analysis.ts",
    ]) {
      const src = readFileSync(join(process.cwd(), rel), "utf8");
      expect(src, `${rel} must not reference a specific migration number`).not.toMatch(
        /0006/,
      );
    }
  });
});

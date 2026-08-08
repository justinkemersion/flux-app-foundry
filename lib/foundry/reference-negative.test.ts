import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  canAccessChild,
  wouldCrossTenantAttach,
} from "@/fixtures/reference-app/domain/ownership";
import { attachChildGuard } from "@/fixtures/reference-app/domain/actions";
import {
  detectBrowserFluxViolations,
  detectMissingParentOwnership,
} from "@/scripts/lib/reference-negative";
import { REFERENCE_FIXTURE_DIR } from "@/scripts/lib/reference-compat";

const root = process.cwd();

describe("reference negative: tenant / parent ownership", () => {
  const tenantA = "user-a";
  const tenantB = "user-b";
  const parentA = { id: "rec-a", user_id: tenantA };
  const parentB = { id: "rec-b", user_id: tenantB };

  it("rejects attaching a child to another tenant's parent", () => {
    expect(wouldCrossTenantAttach(tenantA, parentB)).toBe(true);
    const child = { user_id: tenantA, record_id: parentB.id };
    expect(canAccessChild(tenantA, child, parentB)).toBe(false);
    expect(attachChildGuard(tenantA, child, parentB)).toEqual({
      ok: false,
      error: "Forbidden: parent ownership required",
    });
  });

  it("allows child access when parent is owned by the same tenant", () => {
    const child = { user_id: tenantA, record_id: parentA.id };
    expect(canAccessChild(tenantA, child, parentA)).toBe(true);
    expect(attachChildGuard(tenantA, child, parentA)).toEqual({ ok: true });
  });

  it("negative SQL fixture lacks parent-ownership EXISTS", () => {
    const sql = readFileSync(
      join(
        root,
        REFERENCE_FIXTURE_DIR,
        "negative/cross-tenant-child.fixture.sql.txt",
      ),
      "utf8",
    );
    expect(detectMissingParentOwnership(sql)).toBe(true);
  });

  it("canonical 0006 migration enforces parent ownership (positive control)", () => {
    const sql = readFileSync(
      join(root, "sql/migrations/0006_child_record_ownership.sql"),
      "utf8",
    );
    expect(detectMissingParentOwnership(sql)).toBe(false);
    expect(sql).toContain("from records r");
    expect(sql).toContain("r.id = record_id");
  });
});

describe("reference negative: browser-side Flux access", () => {
  function walkTs(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name === ".next") continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) out.push(...walkTs(p));
      else if (/\.(ts|tsx)$/.test(name) && !name.includes(".test.")) out.push(p);
    }
    return out;
  }

  it("negative fixture is detected as a browser Flux violation", () => {
    const src = readFileSync(
      join(
        root,
        REFERENCE_FIXTURE_DIR,
        "negative/browser-flux-bad.fixture.ts.txt",
      ),
      "utf8",
    );
    const hits = detectBrowserFluxViolations(src);
    expect(hits).toContain("NEXT_PUBLIC_FLUX_*");
    expect(hits).toContain("client-module-fetch");
  });

  it("production app/components/lib have no NEXT_PUBLIC_FLUX_* or client fetch to Flux", () => {
    for (const dir of ["app", "components", "lib"]) {
      for (const file of walkTs(join(root, dir))) {
        if (file.endsWith(join("flux", "client.ts"))) continue;
        const src = readFileSync(file, "utf8");
        expect(detectBrowserFluxViolations(src), file).toEqual([]);
        if (src.includes("fetch(")) {
          expect(file, `unexpected fetch in ${file}`).toBe(
            join(root, "lib/flux/client.ts"),
          );
        }
      }
    }
  });
});

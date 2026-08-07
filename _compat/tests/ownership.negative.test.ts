import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  canAccessChild,
  wouldCrossTenantAttach,
} from "../reference-app/domain/ownership";
import { attachChildGuard } from "../reference-app/domain/actions";
import { detectMissingParentOwnership } from "../../scripts/lib/compat-harness";

const root = process.cwd();

describe("compat negative: tenant / parent ownership", () => {
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
        "_compat/reference-app/fixtures/negative/cross-tenant-child.fixture.sql.txt",
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

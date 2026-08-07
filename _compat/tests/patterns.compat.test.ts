import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertPatternAnchors,
  assertReferenceAppLayout,
  readPatternsManifest,
  runCompatSecurity,
} from "../../scripts/lib/compat-harness";

const root = process.cwd();

describe("compat reference-app patterns", () => {
  it("has complete reference app layout", () => {
    expect(assertReferenceAppLayout(root)).toEqual([]);
  });

  it("declares expected pattern coverage", () => {
    const manifest = readPatternsManifest(root);
    const ids = manifest.patterns.map((p) => p.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "session-boundary",
        "tenant-isolation",
        "parent-child-ownership",
        "tags-child-relation",
        "protected-mutations",
        "public-vs-private",
        "archive-lifecycle",
        "validation-errors",
        "migrations-rls",
        "server-only-flux",
      ]),
    );
    expect(manifest.notProduction).toBe(true);
  });

  it("resolves all pattern anchors into the Foundry tree", () => {
    expect(assertPatternAnchors(root)).toEqual([]);
  });

  it("keeps shared security invariants green", () => {
    const checks = runCompatSecurity(root);
    expect(checks.every((c) => c.ok)).toBe(true);
  });

  it("anchors protected mutations to use server + requireSessionSub + actionError", () => {
    for (const file of [
      "app/(dashboard)/actions/records.ts",
      "app/(dashboard)/actions/notes.ts",
    ]) {
      const src = readFileSync(join(root, file), "utf8");
      expect(src).toContain('"use server"');
      expect(src).toContain("requireSessionSub");
      expect(src).toContain("actionError");
    }
  });

  it("documents that media/upload is deferred", () => {
    const purpose = readFileSync(
      join(root, "_compat/reference-app/PURPOSE.md"),
      "utf8",
    );
    expect(purpose.toLowerCase()).toContain("media/upload");
    expect(existsSync(join(root, "lib/flux/media.ts"))).toBe(false);
  });
});

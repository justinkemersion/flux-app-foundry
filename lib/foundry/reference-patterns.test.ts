import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertReferenceFixtureLayout,
  assertReferencePatternAnchors,
  readReferencePatterns,
} from "@/scripts/lib/reference-patterns";
import { REFERENCE_FIXTURE_DIR } from "@/scripts/lib/reference-compat";

const root = process.cwd();

describe("reference pattern anchors", () => {
  it("has complete reference fixture layout", () => {
    expect(assertReferenceFixtureLayout(root)).toEqual([]);
  });

  it("declares expected pattern coverage", () => {
    const manifest = readReferencePatterns(root);
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
    expect(manifest.baselineVersion).toBe("0.6.0");
  });

  it("resolves all pattern anchors into the Foundry tree", () => {
    expect(assertReferencePatternAnchors(root)).toEqual([]);
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
    const readme = readFileSync(
      join(root, REFERENCE_FIXTURE_DIR, "README.md"),
      "utf8",
    );
    expect(readme.toLowerCase()).toContain("media/upload");
    const patterns = readReferencePatterns(root);
    expect(patterns.mediaUpload?.toLowerCase()).toContain("deferred");
  });
});

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      out.push(...walk(p));
    } else if (p.endsWith(".ts") || p.endsWith(".tsx")) {
      out.push(p);
    }
  }
  return out;
}

function assertNoRawFetch(rootRel: string, allowSuffixes: string[]) {
  const root = join(process.cwd(), rootRel);
  const files = walk(root).filter((f) => !f.includes(".test."));
  for (const file of files) {
    if (allowSuffixes.some((suffix) => file.endsWith(suffix))) continue;
    const src = readFileSync(file, "utf8");
    if (src.includes("fetch(")) {
      expect.fail(
        `Unexpected fetch() in ${file}; use fluxJson from lib/flux/client.ts`,
      );
    }
  }
}

describe("Flux HTTP boundary", () => {
  it("does not use fetch() under lib/ except lib/flux/client.ts", () => {
    assertNoRawFetch("lib", [join("flux", "client.ts")]);
  });

  it("does not use fetch() under app/", () => {
    assertNoRawFetch("app", []);
  });
});

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detectBrowserFluxViolations } from "../../scripts/lib/compat-harness";

const root = process.cwd();

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

describe("compat negative: browser-side Flux access", () => {
  it("negative fixture is detected as a browser Flux violation", () => {
    const src = readFileSync(
      join(
        root,
        "_compat/reference-app/fixtures/negative/browser-flux-bad.fixture.ts.txt",
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
          // only lib/flux/client.ts may fetch; already skipped
          expect(file, `unexpected fetch in ${file}`).toBe(
            join(root, "lib/flux/client.ts"),
          );
        }
      }
    }
  });
});

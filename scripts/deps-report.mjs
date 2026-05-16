#!/usr/bin/env node
/**
 * Writes dependency check artifacts for CI (outdated + audit).
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = join(process.cwd(), ".local", "deps-reports");
mkdirSync(outDir, { recursive: true });

function run(cmd, outfile) {
  try {
    const out = execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    writeFileSync(join(outDir, outfile), out);
    return { ok: true, out };
  } catch (e) {
    const out = (e.stdout ?? "") + (e.stderr ?? "") + (e.message ?? "");
    writeFileSync(join(outDir, outfile), out);
    return { ok: false, out };
  }
}

const outdated = run("pnpm outdated --format list", "outdated.txt");
const audit = run("pnpm audit", "audit.txt");

const summary = [
  "# Dependency report",
  "",
  "## Outdated packages",
  "```",
  outdated.out.trim() || "(none reported)",
  "```",
  "",
  "## Audit",
  "```",
  audit.out.trim().slice(0, 12000) || "(clean)",
  "```",
].join("\n");

writeFileSync(join(outDir, "summary.md"), summary);
console.log(summary);

if (!outdated.ok) {
  console.log("\n(pnpm outdated reported packages — see outdated.txt)");
}
if (!audit.ok) {
  console.log("\n(pnpm audit reported findings — see audit.txt)");
}

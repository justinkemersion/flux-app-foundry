#!/usr/bin/env node
/**
 * Module graph enforcement: circular imports + dependency-cruiser rules.
 */
import { execSync } from "node:child_process";

const ROOT = process.cwd();
let failed = false;

function run(label, cmd) {
  console.log(`\n== ${label} ==\n`);
  try {
    execSync(cmd, { cwd: ROOT, stdio: "inherit" });
    console.log(`\n${label}: passed`);
  } catch {
    console.error(`\n${label}: failed`);
    failed = true;
  }
}

run(
  "madge (circular)",
  "pnpm exec madge --circular --extensions ts,tsx --ts-config tsconfig.json app lib components",
);

run(
  "dependency-cruiser",
  "pnpm exec depcruise app lib components --config .dependency-cruiser.cjs --output-type err",
);

if (failed) {
  process.exit(1);
}

console.log("\nGraph checks passed.");

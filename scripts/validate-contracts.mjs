import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CONTRACT_DIR = join(ROOT, "_contract");

const REQUIRED_FILES = [
  "architecture.md",
  "design.md",
  "database.md",
  "flux.md",
  "flux-workflow.md",
  "anti-drift.md",
  "cursor-workflow.md",
  "component-rules.md",
  "route-rules.md",
  "dependency-policy.md",
  "forking.md",
];

const REQUIRED_HEADINGS = {
  "database.md": ["## RLS invariant"],
  "flux.md": ["## HTTP boundary"],
  "flux-workflow.md": ["## Setup order", "## v2_shared JWT bridge invariant"],
  "anti-drift.md": ["## CI gates"],
  "dependency-policy.md": ["## Source of truth", "## Forbidden"],
  "forking.md": ["## Forbidden"],
};

const MIN_LINES = 20;
const failures = [];

for (const file of REQUIRED_FILES) {
  const path = join(CONTRACT_DIR, file);
  if (!existsSync(path)) {
    failures.push(`Missing ${path}`);
    continue;
  }
  const content = readFileSync(path, "utf8");
  const lines = content.split("\n").length;
  if (lines < MIN_LINES) {
    failures.push(`${file}: only ${lines} lines (min ${MIN_LINES})`);
  }
  for (const heading of REQUIRED_HEADINGS[file] ?? []) {
    if (!content.includes(heading)) {
      failures.push(`${file}: missing heading ${heading}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Contract validation failed:\n" + failures.join("\n"));
  process.exit(1);
}

console.log("Contract validation passed.");

#!/usr/bin/env tsx
/**
 * Fork readiness: baseline tracking, contracts, no template leakage.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readFluxProjectConfig, isFluxHashConfigured } from "../lib/config/flux-schema";
import { loadEnvFiles } from "./lib/load-env";

const root = process.cwd();
loadEnvFiles(root);

const failures: string[] = [];

function requireFile(rel: string, hint?: string) {
  if (!existsSync(join(root, rel))) {
    failures.push(`Missing ${rel}${hint ? ` — ${hint}` : ""}`);
  }
}

requireFile("FOUNDRY_BASELINE.md");
requireFile("_drift/dependency-exceptions.md");
requireFile("_contract/forking.md");
requireFile("_contract/dependency-policy.md");
requireFile("docs/FIRST_FORK.md");

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { name?: string };
const isTemplate = pkg.name === "flux-app-foundry";

const baseline = readFileSync(join(root, "FOUNDRY_BASELINE.md"), "utf8");
if (!baseline.includes("Baseline commit")) {
  failures.push("FOUNDRY_BASELINE.md missing Baseline commit section");
}

if (!isTemplate) {
  if (baseline.includes("N/A — source of truth")) {
    failures.push("FOUNDRY_BASELINE.md still has template upstream text — fill in baseline commit and deviations");
  }
} else {
  console.log("(template repo — skipping package rename check)");
}

if (!isTemplate) {
  try {
    const { hash } = readFluxProjectConfig(root);
    if (!isFluxHashConfigured(hash)) {
      failures.push("flux.json hash not configured — run flux init/push and pnpm flux:schema:sync");
    }
  } catch {
    failures.push("flux.json invalid");
  }
}

for (const plan of ["001-foundation.md", "006-foundation-hardening.md"]) {
  requireFile(join("plans", plan));
}

if (failures.length > 0) {
  console.error("Fork readiness check failed:\n");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("Fork readiness check passed.");

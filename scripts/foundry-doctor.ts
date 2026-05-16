#!/usr/bin/env tsx
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import {
  configuredAuthProviderIds,
  getServerEnv,
  isDefaultAuthSecret,
} from "../lib/config/env";
import { isFluxHashConfigured, readFluxProjectConfig } from "../lib/config/flux-schema";
import { runFluxDoctorChecks } from "./lib/flux-doctor-checks";
import { loadEnvFiles } from "./lib/load-env";

type Check = { name: string; ok: boolean; detail: string };

const root = process.cwd();
const checks: Check[] = [];

function check(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail });
}

loadEnvFiles(root);

check(".env file", existsSync(join(root, ".env")), existsSync(join(root, ".env")) ? "found" : "missing — copy .env.example");

const hasPnpmLock = existsSync(join(root, "pnpm-lock.yaml"));
let pnpmOk = hasPnpmLock;
try {
  const ua = process.env.npm_config_user_agent ?? "";
  pnpmOk = pnpmOk && (ua.includes("pnpm") || Boolean(execSync("pnpm -v", { encoding: "utf8" })));
} catch {
  pnpmOk = false;
}
check("pnpm", pnpmOk, hasPnpmLock ? "pnpm-lock.yaml present" : "use pnpm, not npm/yarn");

const nodeMajor = Number(process.versions.node.split(".")[0]);
check("Node.js >= 20", nodeMajor >= 20, `v${process.versions.node}`);

let remoteDetail = "no origin remote";
let remoteOk = false;
try {
  const remotes = execSync("git remote -v", { cwd: root, encoding: "utf8" });
  remoteOk = remotes.includes("origin");
  remoteDetail = remoteOk ? "origin configured" : remoteDetail;
} catch {
  remoteDetail = "not a git repository";
}
check("git remote", remoteOk, remoteDetail);

const ciDir = join(root, ".github/workflows");
const ciOk =
  existsSync(join(ciDir, "ci.yml")) && existsSync(join(ciDir, "dependency-check.yml"));
check("CI workflows", ciOk, ciOk ? "ci.yml + dependency-check.yml" : "missing workflow files");

const migDir = join(root, "sql/migrations");
let placeholderOk = true;
let placeholderDetail = "no unresolved placeholders";
if (existsSync(migDir)) {
  for (const file of readdirSync(migDir).filter((f) => f.endsWith(".sql"))) {
    const sql = readFileSync(join(migDir, file), "utf8");
    if (sql.includes("{{")) {
      placeholderOk = false;
      placeholderDetail = `${file} contains {{placeholders}}`;
      break;
    }
  }
}
check("SQL migrations", placeholderOk, placeholderDetail);

try {
  const { hash } = readFluxProjectConfig(root);
  check("flux.json hash", isFluxHashConfigured(hash), isFluxHashConfigured(hash) ? hash : "run flux init/push");
} catch (e) {
  check("flux.json", false, e instanceof Error ? e.message : "invalid flux.json");
}

async function runEnvChecks() {
  try {
    const env = getServerEnv();
    check("AUTH_SECRET strength", !isDefaultAuthSecret(env.AUTH_SECRET), "non-default secret");
    check("OAuth providers", configuredAuthProviderIds().length > 0, configuredAuthProviderIds().join(", "));
    check("FLUX_URL", Boolean(env.FLUX_URL), env.FLUX_URL ?? "set in .env for Flux apps");
    check("FLUX_GATEWAY_JWT_SECRET", Boolean(env.FLUX_GATEWAY_JWT_SECRET), "set");
  } catch (e) {
    check("environment", false, e instanceof Error ? e.message : "invalid env");
  }
}

async function main() {
  await runEnvChecks();

  if (process.env.FLUX_URL?.trim()) {
    const fluxChecks = await runFluxDoctorChecks(root);
    for (const c of fluxChecks) {
      check(`Flux: ${c.name}`, c.ok, c.detail);
    }
  } else {
    check("Flux workflow", true, "skipped — set FLUX_URL then run pnpm flux:doctor");
  }

  const failed = checks.filter((c) => !c.ok);
  for (const c of checks) {
    console.log(`${c.ok ? "✓" : "✗"} ${c.name}: ${c.detail}`);
  }

  if (failed.length > 0) {
    const fluxFailed = failed.some((c) => c.name.startsWith("Flux:"));
    console.error(`\n${failed.length} check(s) failed.`);
    if (fluxFailed) {
      console.error("Flux failures: run pnpm flux:doctor and see docs/FLUX_WORKFLOW.md");
    }
    process.exit(1);
  }

  console.log("\nAll doctor checks passed.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

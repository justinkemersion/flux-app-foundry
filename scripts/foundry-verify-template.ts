#!/usr/bin/env tsx
/**
 * Template verify — lint, types, tests, drift, fork check, build.
 * Does not read .env; uses TEMPLATE_BUILD_ENV only for the Next.js build step.
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { TEMPLATE_BUILD_ENV } from "./lib/template-build-env";

const root = process.cwd();

function run(cmd: string, env?: Record<string, string>) {
  console.log(`\n→ ${cmd}\n`);
  execSync(cmd, {
    cwd: root,
    stdio: "inherit",
    env: env ? { ...process.env, ...env } : process.env,
  });
}

if (existsSync(join(root, ".env"))) {
  console.warn(
    "Note: .env is present; verify:template ignores it for the build step (CI stubs only).",
  );
}

run("pnpm lint");
run("pnpm typecheck");
run("pnpm test");
run("pnpm foundry:new-app-check");
run("pnpm foundry:status");
run("pnpm build", TEMPLATE_BUILD_ENV);

console.log("\nTemplate verify passed (no app .env required).");
console.log("Note: golden generated-app acceptance is pnpm foundry:golden-app (CI).");

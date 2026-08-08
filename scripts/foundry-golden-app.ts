#!/usr/bin/env tsx
/**
 * Golden generated-app acceptance: materialize a fresh Foundry tree in a temp
 * workspace and validate the generated result (not only the live source tree).
 *
 * Skips nested golden runs via FOUNDRY_GOLDEN_CHILD=1.
 */
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { TEMPLATE_BUILD_ENV } from "./lib/template-build-env";

const sourceRoot = process.cwd();
const tsxBin = join(sourceRoot, "node_modules/.bin/tsx");

if (process.env.FOUNDRY_GOLDEN_CHILD === "1") {
  console.log("Skipping nested golden-app (already inside a golden workspace).");
  process.exit(0);
}

const ignore = new Set([
  "node_modules",
  ".next",
  ".git",
  ".local",
  "coverage",
]);

function copyTree(src: string, dest: string) {
  cpSync(src, dest, {
    recursive: true,
    filter: (path) => {
      const base = path.split(/[/\\]/).pop() ?? "";
      return !ignore.has(base);
    },
  });
}

function run(cmd: string, cwd: string, env?: Record<string, string>) {
  console.log(`\n→ (${cwd}) ${cmd}\n`);
  execSync(cmd, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, ...env, FOUNDRY_GOLDEN_CHILD: "1" },
  });
}

function runStatus(cwd: string, extraArgs = ""): void {
  const cmd = `${tsxBin} scripts/foundry-status.ts${extraArgs ? ` ${extraArgs}` : ""}`;
  console.log(`\n→ (${cwd}) ${cmd}\n`);
  execSync(cmd, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, FOUNDRY_GOLDEN_CHILD: "1" },
  });
}

function expectStatusFailure(cwd: string, label: string, extraArgs = "") {
  try {
    runStatus(cwd, extraArgs);
    console.error(`Expected ${label} to fail foundry:status`);
    process.exit(1);
  } catch {
    console.log(`${label} correctly reported non-current status`);
  }
}

type StatusJson = {
  status: string;
  securityChecks: Array<{ id: string; status: string; detail: string }>;
};

/** `foundry:status` exits non-zero for any non-current status, so tolerate it. */
function readStatusJson(cwd: string): StatusJson {
  const cmd = `${tsxBin} scripts/foundry-status.ts --json`;
  const env = { ...process.env, FOUNDRY_GOLDEN_CHILD: "1" };
  try {
    return JSON.parse(execSync(cmd, { cwd, encoding: "utf8", env })) as StatusJson;
  } catch (err) {
    const stdout = (err as { stdout?: string }).stdout ?? "";
    return JSON.parse(stdout) as StatusJson;
  }
}

function securityStatus(report: StatusJson, id: string): string {
  return report.securityChecks.find((c) => c.id === id)?.status ?? "missing";
}

const tmp = mkdtempSync(join(tmpdir(), "foundry-golden-"));
const appDir = join(tmp, "app");
console.log(`Materializing golden app at ${appDir}`);

try {
  copyTree(sourceRoot, appDir);

  run("pnpm install --frozen-lockfile", appDir);
  run("pnpm lint", appDir);
  run("pnpm typecheck", appDir);
  run("pnpm test", appDir);
  run("pnpm foundry:new-app-check", appDir);
  run("pnpm foundry:status", appDir);
  run("pnpm foundry:compat", appDir);
  run("pnpm build", appDir, TEMPLATE_BUILD_ENV);

  // Stale/missing/security fixtures — status only (no install); non-destructive to source.
  const staleDir = join(tmp, "stale");
  copyTree(appDir, staleDir);
  const staleManifest = join(staleDir, "foundry.baseline.json");
  const manifest = JSON.parse(readFileSync(staleManifest, "utf8")) as {
    baselineVersion: string;
  };
  manifest.baselineVersion = "0.0.1";
  writeFileSync(staleManifest, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log("\n→ stale fixture: expect behind vs reference");
  expectStatusFailure(
    staleDir,
    "stale fixture",
    `--reference ${join(appDir, "foundry.baseline.json")}`,
  );

  const legacyDir = join(tmp, "legacy");
  copyTree(appDir, legacyDir);
  rmSync(join(legacyDir, "foundry.baseline.json"), { force: true });
  console.log("\n→ legacy fixture: expect unknown");
  expectStatusFailure(legacyDir, "legacy fixture");

  // Removing the parent-ownership migration must be caught by the *property*
  // check, not by a filename lookup.
  const insecureDir = join(tmp, "insecure");
  copyTree(appDir, insecureDir);
  rmSync(join(insecureDir, "sql/migrations/0006_child_record_ownership.sql"), {
    force: true,
  });
  console.log("\n→ insecure fixture: expect missing_security");
  expectStatusFailure(insecureDir, "insecure fixture");
  const insecureReport = readStatusJson(insecureDir);
  if (securityStatus(insecureReport, "child-row-parent-ownership") !== "fail") {
    throw new Error(
      "insecure fixture: child-row-parent-ownership should fail semantically",
    );
  }
  console.log("insecure fixture correctly failed the parent-ownership property");

  // Fork-awareness: the same protection under a different migration number
  // must still satisfy the security baseline. Migration history is app-owned.
  const renumberedDir = join(tmp, "renumbered");
  copyTree(appDir, renumberedDir);
  renameSync(
    join(renumberedDir, "sql/migrations/0006_child_record_ownership.sql"),
    join(renumberedDir, "sql/migrations/0021_parent_ownership.sql"),
  );
  console.log("\n→ renumbered fixture: expect security invariants still satisfied");
  const renumberedReport = readStatusJson(renumberedDir);
  if (renumberedReport.status === "missing_security") {
    throw new Error(
      "renumbered fixture: renaming an app-owned migration must not fail security",
    );
  }
  for (const id of ["child-row-parent-ownership", "tenant-rls-jwt-sub"]) {
    if (securityStatus(renumberedReport, id) !== "pass") {
      throw new Error(`renumbered fixture: ${id} should still pass`);
    }
  }
  console.log("renumbered fixture correctly kept its security capabilities");

  if (!existsSync(join(appDir, "foundry.baseline.json"))) {
    throw new Error("golden app missing foundry.baseline.json");
  }

  console.log("\nGolden generated-app acceptance passed.");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

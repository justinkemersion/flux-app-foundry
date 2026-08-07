import { readFileSync } from "node:fs";
import { join } from "node:path";

export function formatPackageNameAsDisplay(name: string): string {
  return name
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function readPackageName(root: string): string {
  const raw = readFileSync(join(root, "package.json"), "utf8");
  const pkg = JSON.parse(raw) as { name?: string };
  return pkg.name?.trim() || "app";
}

/** npm package name from package.json (forks rename this once). */
export function getAppPackageName(root = process.cwd()): string {
  return readPackageName(root);
}

/** Human-facing title; override with NEXT_PUBLIC_APP_NAME when rebranding UI. */
export function getAppDisplayName(root = process.cwd()): string {
  const override = process.env.NEXT_PUBLIC_APP_NAME?.trim();
  if (override) return override;
  return formatPackageNameAsDisplay(readPackageName(root));
}

/** Home page subtitle; override with NEXT_PUBLIC_APP_TAGLINE. */
export function getAppTagline(): string {
  const override = process.env.NEXT_PUBLIC_APP_TAGLINE?.trim();
  if (override) return override;
  return "Flux-first records with contract-driven anti-drift.";
}

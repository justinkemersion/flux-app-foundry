import { readFileSync } from "node:fs";
import { join } from "node:path";

export type FluxProjectConfig = {
  slug: string;
  hash: string;
};

const PLACEHOLDER_HASH = "REPLACE_AFTER_FLUX_INIT";

export function fluxApiSchemaName(hash: string): string {
  const trimmed = hash.trim();
  if (!trimmed || trimmed === PLACEHOLDER_HASH) {
    throw new Error(
      `flux.json hash is not set. Run \`flux init\` / \`flux push\`, then \`pnpm flux:schema:sync\`.`,
    );
  }
  return `t_${trimmed}_api`;
}

export function readFluxProjectConfig(root = process.cwd()): FluxProjectConfig {
  const path = join(root, "flux.json");
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw) as FluxProjectConfig;
  if (!parsed.slug || !parsed.hash) {
    throw new Error("flux.json must include slug and hash");
  }
  return parsed;
}

export function expectedPostgrestSchema(root = process.cwd()): string {
  const { hash } = readFluxProjectConfig(root);
  return fluxApiSchemaName(hash);
}

export function isFluxHashConfigured(hash: string): boolean {
  return Boolean(hash?.trim()) && hash.trim() !== PLACEHOLDER_HASH;
}

import { readFileSync } from "node:fs";
import { join } from "node:path";

export type FluxProjectConfig = {
  slug: string;
  hash: string;
};

const PLACEHOLDER_HASH = "REPLACE_AFTER_FLUX_INIT";

/** v2_shared tenant API schema (`t_<12 hex>_api`). */
export const V2_TENANT_API_SCHEMA_RE = /^t_[0-9a-f]{12}_api$/;

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

/** Legacy v1-style schema name from the 7-char project hash (not valid for v2_shared). */
export function expectedPostgrestSchema(root = process.cwd()): string {
  const { hash } = readFluxProjectConfig(root);
  return fluxApiSchemaName(hash);
}

export function isFluxHashConfigured(hash: string): boolean {
  const trimmed = hash?.trim();
  return Boolean(trimmed) && trimmed !== PLACEHOLDER_HASH;
}

export function isFluxProjectHashFormat(hash: string): boolean {
  return /^[a-f0-9]{7}$/u.test(hash.trim().toLowerCase());
}

export function isV2TenantApiSchema(schema: string): boolean {
  return V2_TENANT_API_SCHEMA_RE.test(schema.trim());
}

/** `t_<12hex>_api` → `t_<12hex>_role` (v2_shared PostgREST session role). */
export function tenantRoleFromApiSchema(apiSchema: string): string | undefined {
  const m = apiSchema.trim().match(/^t_([0-9a-f]{12})_api$/);
  return m ? `t_${m[1]}_role` : undefined;
}

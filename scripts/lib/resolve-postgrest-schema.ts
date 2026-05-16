import { fluxApiSchemaName, readFluxProjectConfig } from "../../lib/config/flux-schema";
import { fetchProjectMetadata } from "./flux-control-plane";

/**
 * Resolves PostgREST profile for flux.json hash.
 * Prefers control-plane `apiSchema` (v2_shared); falls back to `t_<hash>_api` (v1).
 */
export async function resolvePostgrestSchema(root = process.cwd()): Promise<string> {
  const { hash } = readFluxProjectConfig(root);
  const meta = await fetchProjectMetadata(hash);
  const schema = meta?.apiSchema?.trim();
  if (schema) return schema;
  return fluxApiSchemaName(hash);
}

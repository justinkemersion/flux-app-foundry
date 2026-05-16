import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  fluxApiSchemaName,
  isFluxHashConfigured,
  isFluxProjectHashFormat,
  isV2TenantApiSchema,
  readFluxProjectConfig,
  tenantRoleFromApiSchema,
} from "../../lib/config/flux-schema";
import { fetchProjectList, fetchProjectMetadata, readFluxApiToken } from "./flux-control-plane";
import { probeAuthenticatedBridge, probeUnauthenticatedProfiles } from "./flux-probes";
import { resolvePostgrestSchema } from "./resolve-postgrest-schema";

export type FluxDoctorCheck = { name: string; ok: boolean; detail: string };

export function parseEnvEmptySchemaOverride(root: string): boolean {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return false;
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (/^FLUX_POSTGREST_SCHEMA\s*=\s*$/u.test(trimmed)) return true;
  }
  return false;
}

export async function runFluxDoctorChecks(root = process.cwd()): Promise<FluxDoctorCheck[]> {
  const checks: FluxDoctorCheck[] = [];
  const push = (name: string, ok: boolean, detail: string) => {
    checks.push({ name, ok, detail });
  };

  const fluxJsonPath = join(root, "flux.json");
  push("flux.json", existsSync(fluxJsonPath), existsSync(fluxJsonPath) ? "found" : "missing — run flux init");

  let slug = "";
  let hash = "";
  try {
    const cfg = readFluxProjectConfig(root);
    slug = cfg.slug;
    hash = cfg.hash;
    push("flux.json hash", isFluxHashConfigured(hash), isFluxHashConfigured(hash) ? hash : "run flux init");
    push(
      "flux.json hash format",
      isFluxProjectHashFormat(hash),
      isFluxProjectHashFormat(hash)
        ? "7-char hex (control plane)"
        : `expected 7-char hex, got "${hash}" — use hash from flux list`,
    );
  } catch (e) {
    push("flux.json parse", false, e instanceof Error ? e.message : "invalid");
    return checks;
  }

  const token = readFluxApiToken();
  push("flux login", Boolean(token), token ? "~/.flux/config.json or FLUX_API_TOKEN" : "run flux login");

  const meta = token ? await fetchProjectMetadata(hash) : undefined;
  if (!token) {
    push("control plane metadata", false, "skipped — no API token");
  } else if (!meta) {
    push("control plane metadata", false, `GET /cli/v1/projects/${hash} failed`);
  } else {
    push(
      "flux hash matches control plane",
      meta.hash === hash.trim().toLowerCase() && meta.slug === slug,
      `${meta.slug} (${meta.hash}) mode=${meta.mode}`,
    );
    const apiSchema = meta.apiSchema?.trim();
    push(
      "control plane apiSchema",
      Boolean(apiSchema),
      apiSchema ?? "missing — repair project on control plane",
    );
    if (meta.mode === "v2_shared" && apiSchema) {
      push(
        "v2_shared apiSchema shape",
        isV2TenantApiSchema(apiSchema),
        isV2TenantApiSchema(apiSchema)
          ? apiSchema
          : `expected t_<12hex>_api, got ${apiSchema}`,
      );
      const role = tenantRoleFromApiSchema(apiSchema);
      push("v2_shared tenant role", Boolean(role), role ?? "cannot derive t_*_role");
      const legacyGuess = fluxApiSchemaName(hash);
      push(
        "schema not hash-derived (v2)",
        apiSchema !== legacyGuess,
        apiSchema === legacyGuess
          ? `t_${hash}_api is v1 naming — run pnpm flux:schema:sync after flux login`
          : `canonical ${apiSchema}`,
      );
    }
  }

  const envLocalPath = join(root, ".env.local");
  const envLocalSchema = existsSync(envLocalPath)
    ? readFileSync(envLocalPath, "utf8").match(/^FLUX_POSTGREST_SCHEMA=(.+)$/m)?.[1]?.trim()
    : undefined;
  push(
    ".env.local FLUX_POSTGREST_SCHEMA",
    Boolean(envLocalSchema),
    envLocalSchema ?? "missing — run pnpm flux:schema:sync",
  );

  push(
    ".env schema override",
    !parseEnvEmptySchemaOverride(root),
    parseEnvEmptySchemaOverride(root)
      ? "remove empty FLUX_POSTGREST_SCHEMA= from .env (blocks .env.local)"
      : "ok",
  );

  const fluxUrl = process.env.FLUX_URL?.trim();
  push("FLUX_URL", Boolean(fluxUrl), fluxUrl ?? "set in .env");

  if (fluxUrl && token) {
    const list = await fetchProjectList();
    const row = list?.find((p) => p.slug === slug && p.hash === hash.trim().toLowerCase());
    push(
      "FLUX_URL matches flux list",
      Boolean(row && fluxUrl.replace(/\/$/, "") === row.apiUrl.replace(/\/$/, "")),
      row ? row.apiUrl : `no list entry for ${slug} (${hash})`,
    );
  }

  if (token && isFluxHashConfigured(hash)) {
    try {
      const expected = await resolvePostgrestSchema(root);
      const actual =
        process.env.FLUX_POSTGREST_SCHEMA?.trim() || process.env.FLUX_POSTGREST_PROFILE?.trim();
      push(
        "FLUX_POSTGREST_SCHEMA synced",
        actual === expected,
        actual === expected ? actual! : `have ${actual ?? "(unset)"}, expected ${expected}`,
      );
    } catch (e) {
      push("FLUX_POSTGREST_SCHEMA synced", false, e instanceof Error ? e.message : "resolve failed");
    }
  }

  if (!fluxUrl || !process.env.FLUX_GATEWAY_JWT_SECRET?.trim()) {
    push("PostgREST probes", false, "skipped — set FLUX_URL and FLUX_GATEWAY_JWT_SECRET");
    return checks;
  }

  try {
    const anon = await probeUnauthenticatedProfiles();
    push("unauthenticated probe", anon.ok, anon.detail);
  } catch (e) {
    push("unauthenticated probe", false, e instanceof Error ? e.message : "failed");
  }

  try {
    const authed = await probeAuthenticatedBridge();
    push("authenticated bridge probe", authed.ok, authed.detail);
    if (meta?.mode === "v2_shared" && meta.apiSchema) {
      const role = tenantRoleFromApiSchema(meta.apiSchema);
      push(
        "v2 bridge invariant",
        authed.ok,
        authed.ok
          ? `app JWT (authenticated) → gateway → ${role} → ${meta.apiSchema}`
          : "bridge must map authenticated → tenant role before PostgREST",
      );
    }
  } catch (e) {
    push("authenticated bridge probe", false, e instanceof Error ? e.message : "failed");
  }

  return checks;
}

import { Agent } from "undici";
import { mintFluxJwt } from "../../lib/flux/jwt";

export type ProbeResult = {
  ok: boolean;
  status: number;
  detail: string;
  schemaHeader?: string;
};

function fluxFetchOptions(): { dispatcher?: Agent } {
  if (process.env.FLUX_TLS_INSECURE !== "1") return {};
  return {
    dispatcher: new Agent({ connect: { rejectUnauthorized: false } }),
  };
}

function baseUrl(): string {
  const url = process.env.FLUX_URL?.trim();
  if (!url) throw new Error("FLUX_URL is not set");
  return url.replace(/\/$/, "");
}

function schemaProfile(): string | undefined {
  return process.env.FLUX_POSTGREST_SCHEMA?.trim() || process.env.FLUX_POSTGREST_PROFILE?.trim();
}

/** Gateway-only: no Authorization; expects 200 when tenant schema exists. */
export async function probeUnauthenticatedProfiles(): Promise<ProbeResult> {
  const url = `${baseUrl()}/profiles?limit=0`;
  const res = await fetch(url, fluxFetchOptions() as RequestInit);
  const text = await res.text();
  const schemaHeader = res.headers.get("content-profile") ?? undefined;
  if (res.ok) {
    return { ok: true, status: res.status, detail: `HTTP ${res.status}`, schemaHeader };
  }
  const snippet = text.length > 200 ? `${text.slice(0, 200)}…` : text;
  return { ok: false, status: res.status, detail: `HTTP ${res.status}: ${snippet}`, schemaHeader };
}

/**
 * App JWT (`role: authenticated`) through gateway bridge.
 * 403 permission denied for tenant schema usually means gateway bridge is not minting `t_*_role`.
 */
export async function probeAuthenticatedBridge(sub = "foundry-flux-doctor-probe"): Promise<ProbeResult> {
  const profile = schemaProfile();
  if (!profile) {
    return { ok: false, status: 0, detail: "FLUX_POSTGREST_SCHEMA is not set" };
  }
  const token = await mintFluxJwt(sub);
  const url = `${baseUrl()}/profiles?limit=0`;
  const headers = new Headers({
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Accept-Profile": profile,
  });
  const res = await fetch(url, { headers, ...fluxFetchOptions() } as RequestInit);
  const text = await res.text();
  const schemaHeader = res.headers.get("content-profile") ?? undefined;
  if (res.ok) {
    return { ok: true, status: res.status, detail: `HTTP ${res.status} (bridge OK)`, schemaHeader };
  }
  const permissionDenied =
    res.status === 403 && text.includes("permission denied for schema");
  const hint = permissionDenied
    ? " — gateway must bridge app JWT (authenticated) to tenant role (t_*_role); deploy Flux gateway mintBridgedTenantJwt fix"
    : "";
  const snippet = text.length > 200 ? `${text.slice(0, 200)}…` : text;
  return {
    ok: false,
    status: res.status,
    detail: `HTTP ${res.status}: ${snippet}${hint}`,
    schemaHeader,
  };
}

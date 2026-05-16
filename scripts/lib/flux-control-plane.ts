import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const HOSTED_FLUX_PUBLIC_API_BASE = "https://flux.vsl-base.com/api";

export type FluxProjectMetadata = {
  slug: string;
  hash: string;
  mode: "v1_dedicated" | "v2_shared";
  apiSchema?: string;
};

export type FluxProjectSummary = {
  slug: string;
  hash: string;
  status: string;
  apiUrl: string;
};

export function readFluxApiToken(): string | undefined {
  const fromEnv = process.env.FLUX_API_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  const configPath = join(homedir(), ".flux", "config.json");
  if (!existsSync(configPath)) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(configPath, "utf8")) as { token?: string };
    return parsed.token?.trim() || undefined;
  } catch {
    return undefined;
  }
}

export function resolveFluxApiBase(): string {
  const fromEnv = process.env.FLUX_API_BASE?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return HOSTED_FLUX_PUBLIC_API_BASE;
}

export async function fetchProjectMetadata(hash: string): Promise<FluxProjectMetadata | undefined> {
  const token = readFluxApiToken();
  if (!token) return undefined;
  const h = hash.trim().toLowerCase();
  if (!/^[a-f0-9]{7}$/u.test(h)) return undefined;
  const url = `${resolveFluxApiBase()}/cli/v1/projects/${encodeURIComponent(h)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) return undefined;
  return (await res.json()) as FluxProjectMetadata;
}

export async function fetchProjectList(): Promise<FluxProjectSummary[] | undefined> {
  const token = readFluxApiToken();
  if (!token) return undefined;
  const url = `${resolveFluxApiBase()}/cli/v1/list`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) return undefined;
  return (await res.json()) as FluxProjectSummary[];
}

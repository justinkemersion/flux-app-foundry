import { Agent } from "undici";
import { mintFluxJwt } from "./jwt";

let fluxInsecureAgent: Agent | undefined;

function fluxFetchOptions(): { dispatcher?: Agent } {
  if (process.env.FLUX_TLS_INSECURE !== "1") {
    return {};
  }
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[flux] FLUX_TLS_INSECURE=1 disables TLS verification. Prefer a proper CA in production.",
    );
  }
  if (!fluxInsecureAgent) {
    fluxInsecureAgent = new Agent({
      connect: { rejectUnauthorized: false },
    });
  }
  return { dispatcher: fluxInsecureAgent };
}

function baseUrl(): string {
  const url = process.env.FLUX_URL?.trim();
  if (!url) {
    throw new Error("FLUX_URL is not set");
  }
  return url.replace(/\/$/, "");
}

function postgrestSchemaProfile(): string | undefined {
  return (
    process.env.FLUX_POSTGREST_SCHEMA?.trim() ||
    process.env.FLUX_POSTGREST_PROFILE?.trim() ||
    undefined
  );
}

function applyPostgrestSchemaHeaders(headers: Headers, init: RequestInit): void {
  const profile = postgrestSchemaProfile();
  if (!profile) return;
  const method = (init.method ?? "GET").toUpperCase();
  if (method === "GET" || method === "HEAD") {
    headers.set("Accept-Profile", profile);
  }
  if (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE") {
    headers.set("Content-Profile", profile);
  }
}

export class FluxHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message);
    this.name = "FluxHttpError";
  }
}

/** Single HTTP boundary for Flux / PostgREST. Do not call `fetch` to Flux elsewhere. */
export async function fluxJson<T>(
  sub: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await mintFluxJwt(sub);
  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  applyPostgrestSchemaHeaders(headers, init);
  const res = await fetch(url, {
    ...init,
    headers,
    ...fluxFetchOptions(),
  } as RequestInit);
  const text = await res.text();
  if (!res.ok) {
    const detail =
      text.length > 0 && text.length < 400 ? text : text ? `${text.slice(0, 400)}…` : "";
    throw new FluxHttpError(
      detail ? `Flux ${res.status} ${path}: ${detail}` : `Flux ${res.status} ${path}`,
      res.status,
      text,
    );
  }
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

/**
 * Explicit public vs private access for the baseline.
 * Baseline has no public entity/sharing RLS — only these routes are public.
 */

export const PUBLIC_ROUTES = ["/", "/login"] as const;

export type AccessKind = "public" | "private";

export function routeAccess(pathname: string): AccessKind {
  const path = pathname.split("?")[0] || "/";
  if ((PUBLIC_ROUTES as readonly string[]).includes(path)) return "public";
  return "private";
}

export function requiresSession(pathname: string): boolean {
  return routeAccess(pathname) === "private";
}

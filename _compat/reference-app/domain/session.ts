/**
 * Session boundary contract for the compatibility canary.
 * Mirrors Foundry's requireSessionSub fail-closed behavior (pure; no Auth.js).
 */
import { UnauthorizedError } from "@/lib/flux/errors";

export type SessionLike = { user?: { id?: string | null } | null } | null;

/** Fail closed when session.user.id is missing. */
export function requireSessionSub(session: SessionLike): string {
  const sub = session?.user?.id;
  if (!sub) {
    throw new UnauthorizedError();
  }
  return sub;
}

export function isAuthenticated(session: SessionLike): boolean {
  return Boolean(session?.user?.id);
}

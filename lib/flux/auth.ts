import { auth } from "@/auth";
import { UnauthorizedError } from "./errors";

export { UnauthorizedError };

/** Returns stable OAuth subject for Flux RLS / JWT `sub`. */
export async function requireSessionSub(): Promise<string> {
  const session = await auth();
  const sub = session?.user?.id;
  if (!sub) {
    throw new UnauthorizedError();
  }
  return sub;
}

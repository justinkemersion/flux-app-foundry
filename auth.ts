import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { configuredAuthProviderIds } from "@/lib/config/env";

function buildProviders(): Provider[] {
  const providers: Provider[] = [];
  const ids = configuredAuthProviderIds();
  if (ids.includes("github")) {
    providers.push(
      GitHub({
        clientId: process.env.AUTH_GITHUB_ID!,
        clientSecret: process.env.AUTH_GITHUB_SECRET!,
      }),
    );
  }
  if (ids.includes("google")) {
    providers.push(
      Google({
        clientId: process.env.AUTH_GOOGLE_ID!,
        clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      }),
    );
  }
  return providers;
}

const providers = buildProviders();

if (providers.length === 0 && process.env.NODE_ENV !== "test") {
  throw new Error(
    "No auth providers configured. Set AUTH_GITHUB_* and/or AUTH_GOOGLE_* in .env",
  );
}

function jwtSessionInnerError(error: Error): Error | undefined {
  if (error.name !== "JWTSessionError") return undefined;
  const cause = error.cause;
  if (cause instanceof Error) return cause;
  if (cause && typeof cause === "object" && "err" in cause) {
    const inner = (cause as { err?: unknown }).err;
    if (inner instanceof Error) return inner;
  }
  return undefined;
}

/** Auth.js clears the session cookie after JWTSessionError; treat as logged-out, not fatal. */
function isStaleSessionCookieError(error: Error): boolean {
  if (error.name !== "JWTSessionError") return false;
  const inner = jwtSessionInnerError(error);
  if (!inner) return true;
  return (
    inner.message.includes("no matching decryption secret") ||
    inner.message === "Invalid JWT"
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  logger: {
    error(error) {
      if (isStaleSessionCookieError(error)) return;
      console.error("[auth]", error);
    },
  },
  providers,
  callbacks: {
    jwt({ token, account }) {
      if (account?.providerAccountId) {
        token.sub = account.providerAccountId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});

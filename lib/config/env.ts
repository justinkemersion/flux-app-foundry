import { z } from "zod";

const DEFAULT_AUTH_SECRETS = new Set([
  "changeme",
  "your-secret-here",
  "ci-build-secret-min-32-characters-long",
  "test-auth-secret-minimum-32-chars",
]);

const serverEnvSchema = z
  .object({
    AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
    AUTH_GITHUB_ID: z.string().optional(),
    AUTH_GITHUB_SECRET: z.string().optional(),
    AUTH_GOOGLE_ID: z.string().optional(),
    AUTH_GOOGLE_SECRET: z.string().optional(),
    FLUX_URL: z.string().url("FLUX_URL must be a valid URL"),
    FLUX_GATEWAY_JWT_SECRET: z.string().min(16, "FLUX_GATEWAY_JWT_SECRET is required"),
    FLUX_POSTGREST_SCHEMA: z.string().min(1).optional(),
    FLUX_POSTGREST_PROFILE: z.string().min(1).optional(),
    FLUX_TLS_INSECURE: z.enum(["0", "1"]).optional(),
    DEMO_USER_SUB: z.string().optional(),
  })
  .refine(
    (env) =>
      Boolean(
        (env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET) ||
          (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET),
      ),
    { message: "Configure AUTH_GITHUB_* and/or AUTH_GOOGLE_*" },
  );

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

/** Parsed server environment. Throws with actionable messages when invalid. */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    const msg = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${msg}`);
  }
  cached = result.data;
  return cached;
}

export function isDefaultAuthSecret(secret: string): boolean {
  const normalized = secret.trim().toLowerCase();
  return DEFAULT_AUTH_SECRETS.has(normalized) || normalized.includes("example");
}

export function configuredAuthProviderIds(): Array<"github" | "google"> {
  const env = process.env;
  const providers: Array<"github" | "google"> = [];
  if (env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET) providers.push("github");
  if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) providers.push("google");
  return providers;
}

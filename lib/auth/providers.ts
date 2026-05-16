import { configuredAuthProviderIds } from "@/lib/config/env";

export type AuthProviderId = "github" | "google";

export function configuredAuthProviders(): AuthProviderId[] {
  return configuredAuthProviderIds();
}

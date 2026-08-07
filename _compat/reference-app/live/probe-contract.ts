/**
 * Optional live Flux integration contract for foundry:compat.
 *
 * Activated only when FOUNDRY_COMPAT_LIVE=1.
 * Reuses scripts/lib/flux-probes.ts — does not invent Flux-core behavior,
 * embed secrets, or perform destructive DB work.
 */
import {
  probeAuthenticatedBridge,
  probeUnauthenticatedProfiles,
  type ProbeResult,
} from "../../../scripts/lib/flux-probes";

export type LiveProbeReport = {
  mode: "live";
  skipped: boolean;
  reason?: string;
  probes: Array<{ id: string; result: ProbeResult }>;
};

function hasLiveCredentials(): boolean {
  return Boolean(
    process.env.FLUX_URL?.trim() &&
      process.env.FLUX_GATEWAY_JWT_SECRET?.trim() &&
      (process.env.FLUX_POSTGREST_SCHEMA?.trim() ||
        process.env.FLUX_POSTGREST_PROFILE?.trim()),
  );
}

export function isLiveModeRequested(): boolean {
  return process.env.FOUNDRY_COMPAT_LIVE === "1";
}

/**
 * Run live probes when requested. Fails closed if live mode is on without creds.
 * When live mode is not requested, returns skipped without error.
 */
export async function runLiveProbeContract(): Promise<LiveProbeReport> {
  if (!isLiveModeRequested()) {
    return {
      mode: "live",
      skipped: true,
      reason: "FOUNDRY_COMPAT_LIVE not set — local-only compat mode",
      probes: [],
    };
  }

  if (!hasLiveCredentials()) {
    return {
      mode: "live",
      skipped: false,
      reason:
        "FOUNDRY_COMPAT_LIVE=1 but FLUX_URL / FLUX_GATEWAY_JWT_SECRET / FLUX_POSTGREST_SCHEMA missing",
      probes: [],
    };
  }

  const probes: LiveProbeReport["probes"] = [
    { id: "unauthenticated-profiles", result: await probeUnauthenticatedProfiles() },
    { id: "authenticated-bridge", result: await probeAuthenticatedBridge("foundry-compat-probe") },
  ];

  return { mode: "live", skipped: false, probes };
}

export function liveProbePassed(report: LiveProbeReport): boolean {
  if (report.skipped) return true;
  if (report.reason && report.probes.length === 0) return false;
  return report.probes.every((p) => p.result.ok);
}

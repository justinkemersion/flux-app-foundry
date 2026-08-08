/**
 * Negative-fixture detectors for the canonical reference compatibility harness.
 * Ported from the discarded `_compat` alternate layout (PR #5).
 */

/** Detect browser-Flux anti-patterns in a source string (for negative fixtures). */
export function detectBrowserFluxViolations(src: string): string[] {
  const hits: string[] = [];
  if (/NEXT_PUBLIC_FLUX_/i.test(src)) hits.push("NEXT_PUBLIC_FLUX_*");
  if (/"use client"/.test(src) && /fetch\s*\(/.test(src)) {
    hits.push("client-module-fetch");
  }
  return hits;
}

/** Detect missing parent-ownership in a policy SQL fragment. */
export function detectMissingParentOwnership(sql: string): boolean {
  const lower = sql.toLowerCase();
  const hasPolicy = lower.includes("create policy");
  const hasParentExists =
    lower.includes("exists (") &&
    lower.includes("from records") &&
    lower.includes("record_id");
  return hasPolicy && !hasParentExists;
}

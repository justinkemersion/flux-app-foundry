# ADR 001 — Foundry baseline ownership & lifecycle

## Status

Accepted (2026-08-07)

## Context

Foundry is forked into domain apps. Without an explicit ownership and version model, security fixes and contract updates do not propagate reliably, and agents overwrite app customizations or invent Flux-core behavior.

## Decision

1. **Canonical machine manifest:** `foundry.baseline.json` records `baselineVersion`, source commit, required scripts/paths, security baseline migrations/invariants, and content fingerprints of Foundry-owned paths.
2. **Human companion:** `FOUNDRY_BASELINE.md` remains the fork-facing sync log (commit, last synced, deviations).
3. **Ownership split**
   - **Foundry-owned:** `_contract/`, `_compat/` (compatibility reference harness), `lib/flux/`, Foundry/Flux/check scripts, CI workflows, security migrations through `0006_*`, `foundry.baseline.json`, `AGENTS.md`, baseline ADR.
   - **App-owned:** `app/` domain UI, branding, `FOUNDRY_BASELINE.md` content, `_drift/dependency-exceptions.md`, plans after the foundation set, new numbered migrations (`0007+`).
4. **Detection over mutation:** `pnpm foundry:status` reports `current` | `behind` | `locally_customized` | `missing_security` | `unknown`. No automatic overwrite upgrade in this lifecycle.
5. **Legacy forks:** Missing `foundry.baseline.json` ⇒ `unknown` (not a hard break of the app). Remediation is to adopt the manifest from upstream.
6. **Flux surface:** Foundry references `_contract/flux.md` + `_contract/flux-workflow.md` rather than inventing a Flux-core API version.
7. **Propagation:** Security/migration fixes ship as new Foundry commits; apps sync owned paths, re-run doctor/verify, update their baseline metadata.
8. **Compatibility canary:** `_compat/reference-app` + `pnpm foundry:compat` exercise supported baseline patterns (session, RLS/tenant, parent ownership, tags, protected actions, public/private routes, archive, validation, server-only Flux). Complements `foundry:golden-app`; does not replace it. Default local mode needs no Flux credentials; optional live probes use `FOUNDRY_COMPAT_LIVE=1`.

## Status meanings

| Status | Meaning |
|--------|---------|
| `current` | Manifest present; fingerprints match; security invariants pass; not behind reference |
| `locally_customized` | Owned paths or required scripts/paths differ from stamped baseline |
| `behind` | Local `baselineVersion` < `--reference` manifest version |
| `missing_security` | Security invariant checks failed |
| `unknown` | No manifest (legacy / unmanaged) |

## Dependency policy

Critical infra deps follow `_contract/dependency-policy.md`: patches anytime, minors on a maintenance cadence, majors only via planned upgrades. High/critical vulnerabilities get a dedicated patch PR; do not wait for a broad rewrite.

## Consequences

- CI validates the template, a materialized golden app, and the compatibility canary.
- Doctors report baseline/security locally without Flux credentials.
- Agents must follow `AGENTS.md` and must not weaken RLS or fake doctor results.
- Shared contract/template changes must keep `pnpm foundry:compat` green.

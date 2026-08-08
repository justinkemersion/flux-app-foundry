# Canonical reference app (compatibility harness)

This fixture declares the **Flux Foundry template itself** as the durable, intentionally boring reference application used as a compatibility canary.

It is **not** production application code. Do not ship, deploy, or brand this tree as a second product UI.

## Purpose

Prove Foundry-supported patterns still hold after template, security, or baseline changes:

- Auth fail-closed + public vs protected routes
- Tenant/user isolation and parent/child ownership (including tags)
- Create / read / update / archive conventions
- Server actions + `lib/flux` access only
- Validation and safe user-facing errors
- Migrations + security invariants
- Env/config hygiene (no browser Flux credentials)
- Baseline / drift detection against this reference
- Deliberate negative fixtures (browser Flux, missing parent ownership)

**Media/upload:** deferred — no canonical baseline pattern yet; do not invent one for coverage.

## Layout

| Path | Role |
|------|------|
| `manifest.json` | Capability checklist (local / live / Flux-core pending) |
| `patterns.json` | Anchors each supported pattern into template files |
| `domain/` | Pure TypeScript models of session, ownership, archive, validation |
| `negative/` | Deliberate bad patterns for negative tests (`.txt` so not executed) |

## Ownership

| Artifact | Owner |
|----------|--------|
| `fixtures/reference-app/**` | Foundry |
| Template subject (`app/`, `lib/flux/`, `sql/migrations/`, …) | Foundry (security/contracts) + app domain surface |
| Live Flux-core semantics | Flux core — marked `pending` here, never faked |

## Commands

```bash
pnpm foundry:compat                 # deterministic local checks + canary Vitest
pnpm foundry:reference:verify       # alias
pnpm foundry:compat --live          # also run opt-in live probes when credentials exist
pnpm foundry:compat --json
```

Live probes that depend on Flux-core contracts remain **pending** until the platform defines them; missing credentials skip live checks without pretending success.

## Related

- [`docs/REFERENCE_APP.md`](../../docs/REFERENCE_APP.md) — capability coverage matrix
- [`docs/BASELINE_CHANGELOG.md`](../../docs/BASELINE_CHANGELOG.md) — baseline version release notes
- [`docs/adr/001-baseline-ownership.md`](../../docs/adr/001-baseline-ownership.md)

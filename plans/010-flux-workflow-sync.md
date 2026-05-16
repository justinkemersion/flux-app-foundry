# Plan 010 — Flux workflow sync

**Goal:** Detect “out of tune” Flux platform / app state early so forks do not ship SQL or UI against the wrong schema or a broken gateway bridge.

## Checklist

- [x] `_contract/flux-workflow.md` — setup order, v2 bridge invariant, env rules
- [x] `docs/FLUX_WORKFLOW.md` — operator guide
- [x] `pnpm flux:doctor` — control plane, schema sync, PostgREST probes
- [x] `pnpm flux:schema:sync` — resolve `apiSchema` from control plane (v2_shared)
- [x] `lib/config/flux-schema.ts` — v2 schema/role helpers
- [x] `foundry:doctor` delegates Flux checks via `runFluxDoctorChecks`
- [x] Docs: `FIRST_FORK.md`, `README.md` — canonical command order
- [x] `.env.example` — do not set empty `FLUX_POSTGREST_SCHEMA` in `.env`
- [ ] Upstream: deploy Flux gateway `mintBridgedTenantJwt` to production
- [ ] Sync hardening commit back to `flux-app-foundry` template

## Exit

On a configured clone:

```bash
flux login
pnpm flux:schema:sync
pnpm flux:doctor
pnpm foundry:doctor
```

All pass after `flux push` and gateway bridge fix is deployed.

## Notes (Roommating fork trial)

First real fork exposed:

1. Placeholder `flux.json` hash vs 7-char control-plane id
2. v2 `apiSchema` (`t_<12hex>_api`) vs hash-derived `t_<7hex>_api`
3. Gateway bridge must map `authenticated` → `t_<12hex>_role`

Foundry hardening encodes these as automated checks.

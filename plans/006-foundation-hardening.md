# Plan 006 — Foundation hardening

Milestone **0.2** (hardening only). No product features.

## Goal

Make the foundation fork-safe, repeatable, and resistant to manual setup drift.

## Checklist

- [x] Remove manual SQL placeholder replacement (`0003` deleted; schema-less migrations)
- [x] Typed env config (`lib/config/env.ts`)
- [x] `pnpm foundry:doctor`
- [x] `pnpm foundry:new-app-check`
- [x] `FOUNDRY_BASELINE.md` + `_drift/dependency-exceptions.md`
- [x] `_contract/dependency-policy.md` + `_contract/forking.md`
- [x] Dependency check workflow
- [x] Setup verification (doctor + `check:sql`)
- [x] First fork guide (`docs/FIRST_FORK.md`)
- [x] `pnpm flux:schema:sync` derives PostgREST schema from `flux.json`
- [x] `foundry:verify` runs full gate suite

## Exit

`pnpm foundry:doctor` passes on a correctly configured clone. Fork guide is actionable without editing SQL by hand.

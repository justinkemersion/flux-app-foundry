# Forking contract

## Purpose

Fork `flux-app-foundry` into domain apps (Roommating, HOA Portal, Bookworm, etc.) **without corrupting** the Foundry baseline discipline.

## Before you fork

1. Run `pnpm foundry:doctor` on a clean upstream clone.
2. Read `_contract/dependency-policy.md` and `docs/FIRST_FORK.md`.

## Required fork files

| File | Purpose |
|------|---------|
| `FOUNDRY_BASELINE.md` | Upstream commit, last sync, deviations |
| `_drift/dependency-exceptions.md` | Documented dependency pins only |

## Allowed changes in a fork

- Rename app in `package.json`, README, UI copy
- Add domain tables in **new** numbered migrations (never edit applied upstream migrations)
- Add routes under `app/(dashboard)/`
- Add plans in `plans/` for domain work

## Forbidden in a fork

- Removing `_contract/` or anti-drift CI
- Bypassing `lib/flux/client.ts` for HTTP
- Editing committed upstream migration files in place
- Framework major upgrades during feature branches
- Overlapping UI libraries alongside `components/ui`

## Syncing from upstream

Periodically merge or cherry-pick from `flux-app-foundry`:

1. Resolve conflicts favoring upstream for contracts, `lib/flux/`, CI, scripts
2. Re-run `pnpm foundry:doctor` and `pnpm foundry:verify`
3. Update `FOUNDRY_BASELINE.md` last-synced date and commit

## Flux schema

Do not hand-edit schema names in SQL. Use `pnpm flux:schema:sync` after `flux init` / `flux push` updates `flux.json`.

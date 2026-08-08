# Forking contract

## Purpose

Fork `flux-app-foundry` into domain apps (Roommating, HOA Portal, Bookworm, etc.) **without corrupting** the Foundry baseline discipline.

## Before you fork

1. On a clean upstream clone (no `.env` required): `pnpm foundry:verify:template`.
2. After copying `.env` and linking Flux: `pnpm foundry:doctor`.
3. Read `_contract/dependency-policy.md` and `docs/FIRST_FORK.md`.

## Required fork files

| File | Purpose |
|------|---------|
| `foundry.baseline.json` | Machine baseline version, commit, owned-path fingerprints |
| `FOUNDRY_BASELINE.md` | Human sync log: upstream commit, last sync, deviations |
| `AGENTS.md` | Non-negotiable AI/maintainer guardrails |
| `_drift/dependency-exceptions.md` | Documented dependency pins only |

Ownership and status meanings: [`docs/adr/001-baseline-ownership.md`](../docs/adr/001-baseline-ownership.md).

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

1. Resolve conflicts favoring upstream for Foundry-owned paths (contracts, `lib/flux/`, CI, Foundry scripts, security migrations, `foundry.baseline.json`, `AGENTS.md`)
2. Run `pnpm foundry:status` (optionally `--reference` upstream manifest) — **detection only**; do not blind-overwrite app-owned files
3. Re-run `pnpm foundry:doctor` and `pnpm foundry:verify`
4. Update `FOUNDRY_BASELINE.md` last-synced date and commit

Legacy forks without `foundry.baseline.json` report `unknown` until they adopt the manifest.

### Migrations are yours

`sql/migrations/` is **application-owned history**. Foundry's security checks assert properties, not filenames, so:

- Never rename or renumber an existing migration to satisfy a check — the Flux ledger records checksums, and rewriting history breaks it.
- Close a security gap by adding a **new** numbered migration (`0021_parent_ownership.sql` is as valid as `0006_child_record_ownership.sql`).
- Ownership columns may be named whatever your domain calls them; the analyzer reads the comparison, not the column name.
- If a check reports `unknown`, it could not prove the property either way. Review it, and if the pattern is intentional record it under `securityBaseline.ownership` in `foundry.baseline.json` rather than weakening the policy.

## Flux schema

Do not hand-edit schema names in SQL. Push with `flux push sql/migrations/` (versioned ledger), then `pnpm flux:schema:sync` after `flux init` / hash changes.

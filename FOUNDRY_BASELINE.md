# Foundry Baseline

This repository **is** the upstream template.

| Field | Value |
|-------|--------|
| Based on | `flux-app-foundry` (self) |
| Machine manifest | `foundry.baseline.json` |
| Baseline version | See `baselineVersion` in `foundry.baseline.json` |
| Baseline commit | See `source.commit` in `foundry.baseline.json` (or `git rev-parse HEAD`) |
| Last synced | N/A (upstream source of truth) |
| Flux surface | `_contract/flux.md`, `_contract/flux-workflow.md` |

## Blessed stack (maintain in dependency policy)

- Next.js App Router + React + TypeScript (strict)
- Tailwind CSS v4
- Auth.js v5 + `jose`
- Flux via PostgREST (`lib/flux/` boundary)
- Vitest + ESLint + Prettier

## Local deviations

_None — this is the template._

## Release notes

Baseline version bumps are summarized in [`docs/BASELINE_CHANGELOG.md`](docs/BASELINE_CHANGELOG.md).

## Reference compatibility

The template app is the canonical reference subject. The sole canary is `fixtures/reference-app/` via `pnpm foundry:compat` (see [`docs/REFERENCE_APP.md`](docs/REFERENCE_APP.md)). Do not add a parallel `_compat/` harness.

## Forks

1. Copy/update `foundry.baseline.json` when syncing from upstream (do not re-stamp casually).
2. Fill this file with upstream commit, last synced date, and deviations.
3. Run `pnpm foundry:status` (and optionally `--reference path/to/upstream/foundry.baseline.json`).
4. Run `pnpm foundry:compat` after syncing Foundry-owned paths.
5. Ownership model: `docs/adr/001-baseline-ownership.md` and `AGENTS.md`.
6. Read `docs/BASELINE_CHANGELOG.md` for each skipped baseline version.

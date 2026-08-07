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

## Forks

1. Copy/update `foundry.baseline.json` when syncing from upstream (do not re-stamp casually).
2. Fill this file with upstream commit, last synced date, and deviations.
3. Run `pnpm foundry:status` (and optionally `--reference path/to/upstream/foundry.baseline.json`).
4. Ownership model: `docs/adr/001-baseline-ownership.md` and `AGENTS.md`.

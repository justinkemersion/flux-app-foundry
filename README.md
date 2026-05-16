# flux-app-foundry

A disciplined Flux-first CRUDe application system for contract-driven, anti-drift development with Cursor.

**Status:** Milestone 0.1 working foundation · 0.2 hardening (fork-safe setup).

## Stack

- Next.js App Router, React, TypeScript (strict), Tailwind CSS
- Auth.js v5 (GitHub and/or Google — whichever env vars are set)
- Flux / PostgREST / PostgreSQL with RLS-first schema
- pnpm, Vitest, GitHub Actions CI

## Quick start

```bash
pnpm install
cp .env.example .env
# Set AUTH_SECRET, at least one OAuth provider, FLUX_URL, FLUX_GATEWAY_JWT_SECRET
pnpm foundry:doctor
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in, then use `/dashboard`.

## Flux setup

1. `flux init` or link your project; update `flux.json` slug/hash.
2. `flux push` — applies `sql/migrations/` in your API schema context (no manual schema editing).
3. `pnpm flux:schema:sync` — writes `FLUX_POSTGREST_SCHEMA=t_<hash>_api` to `.env.local`.

See [`sql/migrations/README.md`](sql/migrations/README.md).

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm foundry:doctor` | Validate env, Flux config, SQL hygiene, tooling |
| `pnpm foundry:verify` | Full gate: lint, typecheck, test, drift, build |
| `pnpm foundry:new-app-check` | Fork readiness (baseline, contracts, flux hash) |
| `pnpm flux:schema:sync` | Derive PostgREST schema from `flux.json` |
| `pnpm deps:check` / `pnpm deps:audit` | Dependency maintenance |
| `pnpm seed:demo` | Seed sample data (`DEMO_USER_SUB` required) |

## Forking

See [`docs/FIRST_FORK.md`](docs/FIRST_FORK.md) and [`_contract/forking.md`](_contract/forking.md).

Track lineage in `FOUNDRY_BASELINE.md` and pins in `_drift/dependency-exceptions.md`.

## Cursor workflow

1. Read `_contract/` and the active `plans/NNN-*.md`
2. Use `prompts/` templates for repeatable tasks
3. Run `pnpm foundry:verify` before finishing

## Repository layout

- `_contract/` — enforceable laws (including `dependency-policy.md`, `forking.md`)
- `_drift/` — fork exception log
- `lib/config/` — typed env + Flux schema helpers
- `plans/` — phased execution checklists
- `lib/flux/` — single Flux HTTP boundary
- `sql/migrations/` — RLS-first schema (unqualified names)

## Identity

`session.user.id` is the OAuth provider account id. It becomes the JWT `sub` and all `user_id` columns. Flux is never called from the browser.

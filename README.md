# flux-app-foundry

A disciplined Flux-first CRUDe application system for contract-driven, anti-drift development with Cursor.

**Status:** 0.1 foundation · 0.2 repeatable setup · 0.3 observable architecture · 0.4 fork-proven.

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

Create the Flux project **before** domain SQL. Full guide: [`docs/FLUX_WORKFLOW.md`](docs/FLUX_WORKFLOW.md).

```bash
flux login
flux init                    # or link — 7-char hash in flux.json (from flux list)
flux push sql/migrations/…     # each file in order
pnpm flux:schema:sync          # FLUX_POSTGREST_SCHEMA → .env.local (control-plane apiSchema)
pnpm flux:doctor               # control plane + gateway bridge probes
```

See [`sql/migrations/README.md`](sql/migrations/README.md).

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm foundry:report` | Architecture reports + generated route/component inventories |
| `pnpm flux:doctor` | Flux control plane, schema sync, gateway bridge probes |
| `pnpm foundry:doctor` | App env, OAuth, SQL hygiene + Flux checks when `FLUX_URL` is set |
| `pnpm foundry:verify:template` | CI / fresh clone: lint, typecheck, test, drift, fork check, build — **no `.env`** |
| `pnpm foundry:verify` | Full gate with your `.env`: run `foundry:doctor` first on forks |
| `pnpm foundry:new-app-check` | Fork readiness (baseline, contracts, flux hash) |
| `pnpm flux:schema:sync` | Write `FLUX_POSTGREST_SCHEMA` to `.env.local` from control plane |
| `pnpm deps:check` / `pnpm deps:audit` | Dependency maintenance |
| `pnpm seed:demo` | Seed sample data (`DEMO_USER_SUB` required) |

## Forking

See [`docs/FIRST_FORK.md`](docs/FIRST_FORK.md) and [`_contract/forking.md`](_contract/forking.md).

Track lineage in `FOUNDRY_BASELINE.md` and pins in `_drift/dependency-exceptions.md`.

## Cursor workflow

1. Read `_contract/` (start with [`_contract/robust-workflow.md`](_contract/robust-workflow.md)) and the active `plans/NNN-*.md`
2. Use `prompts/` templates for repeatable tasks
3. **Deploy code via git only** — [`_contract/deploy.md`](_contract/deploy.md); no rsync/scp shims
4. Template repo: `pnpm foundry:verify:template`. Fork with `.env`: `pnpm flux:doctor`, `pnpm foundry:doctor`, then `pnpm foundry:verify`

## Philosophy

Essays in [`docs/philosophy/`](docs/philosophy/) describe the methodology (AI-assisted, anti-drift, Flux-first, boring CRUD).

## Repository layout

- `_contract/` — enforceable laws (`robust-workflow.md`, `deploy.md`, `dependency-policy.md`, `forking.md`, …)
- `docs/generated/` — inventories from `foundry:report` (gitignored; see README there)
- `_drift/` — fork exception log
- `lib/config/` — typed env + Flux schema helpers
- `plans/` — phased execution checklists
- `lib/flux/` — single Flux HTTP boundary
- `sql/migrations/` — RLS-first schema (unqualified names)

## Identity

`session.user.id` is the OAuth provider account id. It becomes the JWT `sub` and all `user_id` columns. Flux is never called from the browser.

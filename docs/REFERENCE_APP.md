# Foundry canonical reference app

The Foundry template **is** the canonical reference application.  
`fixtures/reference-app/` is the compatibility harness that declares and verifies the patterns that template must keep proving.

## What it proves (local / CI)

| Capability | How it is checked |
|------------|-------------------|
| Pattern anchors + fixture layout | `patterns.json` + `domain/` + `negative/` present; anchors resolve |
| Authenticated flow + fail-closed unauth | Dashboard layout redirect + `requireSessionSub` (+ domain canary) |
| Public vs protected data/routes | `/`, `/login` public; `(dashboard)/**` protected |
| Tenant / user isolation | `tenant-rls-jwt-sub` — ownership column discovered from the policy expression |
| Parent / child ownership (+ tags) | `child-row-parent-ownership` — FK graph + policy analysis, any migration filename |
| Create / read / update / archive | Server actions + `archived_at` soft-archive convention |
| Server actions / API patterns | `"use server"` + `lib/flux`; only Auth.js API route |
| Validation + safe errors | Zod + `actionError` sanitization |
| Migrations + security baseline | Centralized `runSecurityInvariants` |
| Env / config hygiene | `.env.example` secrets; no `NEXT_PUBLIC_FLUX_*` |
| No browser Flux credentials / raw fetches | `no-browser-flux-access` + `no-browser-flux-secrets` (evidence-based; third-party HTTP is allowed) |
| Baseline / drift vs reference | `foundry:status` current + fixture `baselineVersion` match |

## Security regression fixtures

`fixtures/reference-app/security/` holds paired vulnerable and protected shapes so the analyzer's discrimination is itself tested. Each file states its expected verdict in a header comment.

| Fixture | Expected |
|---------|----------|
| `0004_vulnerable_child.sql.txt` | `child-row-parent-ownership` **fail** — child write checks only its own owner id |
| `0021_parent_ownership_renumbered.sql.txt` | **pass** — `EXISTS` against the parent, at a non-0006 number |
| `0007_owner_user_id_ownership.sql.txt` | **pass** — ownership column is `owner_user_id` |
| `0009_helper_delegated_ownership.sql.txt` | **unknown** — unresolvable membership helper, needs review |
| `client-flux-fetch.fixture.ts.txt` | `no-browser-flux-access` **fail** |
| `open-meteo-fetch.fixture.ts.txt` | **pass** — third-party API from a client component |
| `nws-fetch.fixture.ts.txt` | **pass** — third-party API from server code |
| `workers-ai-fetch.fixture.ts.txt` | **pass** — inference API with its own credential |
| `workers-ai-leaks-flux.fixture.ts.txt` | **fail** — carries a Flux credential off-boundary |

## Deferred / live (Flux core or credentials)

| Capability | Status |
|------------|--------|
| Authenticated gateway bridge probe | Opt-in live (`--live` + Flux credentials) |
| Unauth gateway fail-closed semantics | **Pending Flux-core** — observe only, never fake |
| JWT bridging (`authenticated` → `t_*_role`) | **Pending Flux-core** |
| v2 schema rewrite of grants / schema public | **Pending Flux-core** |

These are encoded in `fixtures/reference-app/manifest.json` so CI stays honest offline.

## Commands

```bash
pnpm foundry:compat              # local deterministic harness + canary Vitest
pnpm foundry:reference:verify    # alias
pnpm foundry:compat --live       # + live probes when env is configured
pnpm foundry:compat --json
```

Also covered indirectly by:

- `pnpm test` — Vitest suite includes `lib/foundry/reference-*.test.ts`
- `pnpm foundry:verify:template` — runs tests + `foundry:status`
- `pnpm foundry:golden-app` — materializes a fresh tree and runs `foundry:compat`

## Ownership

See `fixtures/reference-app/README.md` and `docs/adr/001-baseline-ownership.md`.  
Release notes for baseline bumps: `docs/BASELINE_CHANGELOG.md`.

## Consolidation note

Alternate layout `_compat/reference-app` (PR #5) was rejected in favor of this single `fixtures/reference-app` ownership model. Domain canaries, pattern anchors, and negative fixtures from that design were merged here.

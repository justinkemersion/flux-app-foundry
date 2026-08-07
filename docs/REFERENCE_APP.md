# Foundry canonical reference app

The Foundry template **is** the canonical reference application.  
`fixtures/reference-app/` is the compatibility harness that declares and verifies the patterns that template must keep proving.

## What it proves (local / CI)

| Capability | How it is checked |
|------------|-------------------|
| Authenticated flow + fail-closed unauth | Dashboard layout redirect + `requireSessionSub` |
| Public vs protected data/routes | `/`, `/login` public; `(dashboard)/**` protected |
| Tenant / user isolation | RLS `jwt.sub = user_id` security invariant |
| Parent / child ownership | `0006_child_record_ownership.sql` for notes + tags |
| Create / read / update / archive | Server actions + `archived_at` soft-archive convention |
| Server actions / API patterns | `"use server"` + `lib/flux`; only Auth.js API route |
| Validation + safe errors | Zod + `actionError` sanitization |
| Migrations + security baseline | Centralized `runSecurityInvariants` |
| Env / config hygiene | `.env.example` secrets; no `NEXT_PUBLIC_FLUX_*` |
| No browser Flux credentials / raw fetches | Security invariants |
| Baseline / drift vs reference | `foundry:status` current + fixture `baselineVersion` match |

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
pnpm foundry:compat              # local deterministic harness
pnpm foundry:reference:verify    # alias
pnpm foundry:compat --live       # + live probes when env is configured
pnpm foundry:compat --json
```

Also covered indirectly by:

- `pnpm test` — Vitest suite includes `lib/foundry/reference-compat.test.ts`
- `pnpm foundry:verify:template` — runs tests + `foundry:status`
- `pnpm foundry:golden-app` — materializes a fresh tree and runs `foundry:compat`

## Ownership

See `fixtures/reference-app/README.md` and `docs/adr/001-baseline-ownership.md`.  
Release notes for baseline bumps: `docs/BASELINE_CHANGELOG.md`.

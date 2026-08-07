# Reference app — purpose & ownership

This directory is the **canonical Foundry compatibility reference**: an intentionally boring, Flux-derived pattern laboratory.

It is **not** production application code. Production UI lives under `app/` / `components/`. Do not ship, deploy, or brand this tree.

## What it proves

Where the Foundry baseline already supports a pattern, this canary exercises it:

1. Authenticated session boundary (`requireSessionSub`)
2. Tenant isolation via RLS `jwt.sub = user_id`
3. Parent + child records with parent-ownership enforcement (`0006`)
4. Tags as a many-to-many/child relation (`record_tags`)
5. Protected server actions / mutations (`"use server"` + `actionError`)
6. Public vs private route access (marketing/login public; dashboard private)
7. Archive / unarchive lifecycle (`status` + `archived_at`)
8. Representative validation / error sanitization
9. Migrations + RLS contracts
10. Server-only Flux access (no raw browser Flux)

**Media/upload:** omitted — no canonical baseline pattern yet; do not invent one for coverage.

## How it relates to the skeleton

The Foundry skeleton demo (`records` / `notes` / `record_tags`) remains the runtime embodiment of these patterns. This reference app:

- Maps each behavior to those canonical files (`patterns.json`)
- Encodes the same rules as small pure modules under `domain/`
- Runs deterministic local tests + an optional live probe contract

Agents changing Foundry-owned contracts or templates must keep `pnpm foundry:compat` passing.

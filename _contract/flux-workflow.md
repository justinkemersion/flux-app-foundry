# Flux workflow contract

Foundry forks must verify Flux control-plane, gateway, schema, and JWT bridge behavior **before** product work or new SQL migrations.

## Setup order (non-negotiable)

1. `flux login` — control-plane API token (`~/.flux/config.json`)
2. `flux init` or link — creates/links project; writes real `hash` to `flux.json` (7-char hex from `flux list`)
3. Fill `.env`: `FLUX_URL`, `FLUX_GATEWAY_JWT_SECRET` (from `flux project credentials`)
4. `flux push` on each file under `sql/migrations/` — only after step 2
5. `pnpm flux:schema:sync` — writes `FLUX_POSTGREST_SCHEMA` to `.env.local` from control-plane `apiSchema`
6. `pnpm flux:doctor` — platform + gateway probes
7. `pnpm foundry:doctor` — full app preflight (includes Flux when configured)

Do **not** author domain SQL until a Flux project exists and `pnpm flux:doctor` passes.

## Environment rules

| Variable | Where | Rule |
|----------|-------|------|
| `FLUX_URL` | `.env` | Canonical API host from `flux list` |
| `FLUX_GATEWAY_JWT_SECRET` | `.env` | Per-project secret (`flux project credentials`) |
| `FLUX_POSTGREST_SCHEMA` | `.env.local` only | From `pnpm flux:schema:sync`; never empty in `.env` |

Empty `FLUX_POSTGREST_SCHEMA=` in `.env` blocks `.env.local` in some loaders — omit the key from `.env` entirely.

## v2_shared JWT bridge invariant

Apps mint HS256 JWTs with **`role: authenticated`** and stable **`sub`** (OAuth account id). They must **not** mint `t_*_role` directly.

```
App (lib/flux/jwt.ts)     Gateway                    PostgREST (pooled)
─────────────────────     ───────                    ───────────────────
role: authenticated  →    verify project secret  →   role: t_<12hex>_role
sub: <user id>            mintBridgedTenantJwt()       sub: <user id>
                          Accept-Profile: t_<12hex>_api
```

`pnpm flux:doctor` **authenticated bridge probe** fails with `permission denied for schema t_*_api` when the gateway forwards `authenticated` instead of the tenant role.

## Schema naming

| Engine | PostgREST profile | Source |
|--------|-------------------|--------|
| v1_dedicated | `api` or `t_<7hex>_api` | `flux.json` hash (legacy) |
| v2_shared | `t_<12hex>_api` | Control plane `apiSchema` only |

Never hand-edit SQL to inject schema names. Migrations use unqualified table names; `flux push` applies them in the tenant API schema.

## Doctor commands

- `pnpm flux:doctor` — Flux-only gates (control plane, schema sync, probes)
- `pnpm foundry:doctor` — app + env + invokes Flux checks when `FLUX_URL` is set

## Failure modes

| Symptom | Likely cause |
|---------|----------------|
| `expected t_<7hex>_api` wrong schema | `flux:schema:sync` without `flux login` / stale hash in `flux.json` |
| 403 permission denied for schema | Gateway bridge not deployed, or grants not pushed |
| Empty profiles 200 but auth 403 | Same bridge issue |
| `flux.json hash format` fail | Placeholder hash (`roommating01`) — use `flux list` hash |

## Related contracts

- `_contract/flux.md` — app HTTP boundary and `fluxJson`
- `docs/FLUX_WORKFLOW.md` — operator guide

# Flux workflow (Foundry apps)

Use this guide when wiring a Foundry fork to a **Flux** project. Contract: [`_contract/flux-workflow.md`](../_contract/flux-workflow.md).

## Prerequisites

- Flux CLI (`flux login`)
- Dashboard API key stored in `~/.flux/config.json`
- Node 20+, pnpm

## Canonical setup order

```bash
flux login
flux init                    # or link; sets slug + 7-char hash in flux.json
cp .env.example .env
# FLUX_URL + FLUX_GATEWAY_JWT_SECRET from: flux project credentials <slug> --hash <hash>

flux push sql/migrations/ --plan   # optional: preview skip / apply / conflicts
flux push sql/migrations/          # versioned ledger — applies pending files in order

pnpm flux:schema:sync        # writes FLUX_POSTGREST_SCHEMA to .env.local
pnpm flux:doctor             # control plane + gateway probes
pnpm foundry:doctor
pnpm foundry:verify
```

Create the Flux project **before** writing or pushing domain SQL. Migrations assume the tenant API schema already exists.

## Migration ledger

Always push schema through the **versioned** directory flow so each file is recorded in `flux.flux_migrations`:

```bash
flux push sql/migrations/ --plan
flux push sql/migrations/
flux migrations list
```

Do **not** push individual files like `flux push sql/migrations/0001_profiles.sql` without `--mode versioned` — Flux treats those as **raw** (no ledger). After a successful push, commit the SQL to git. Never edit a migration that is already in the ledger; add a new numbered file instead.

## v2_shared vs v1

| | v2_shared (pooled) | v1_dedicated |
|---|-------------------|--------------|
| API URL | `https://api--<slug>--<hash>.vsl-base.com` | Often dotted host; use `flux list` |
| PostgREST schema | `t_<12hex>_api` from control plane | Often `api` |
| App JWT `role` | `authenticated` (gateway bridges) | `authenticated` |
| Internal PostgREST role | `t_<12hex>_role` | `authenticated` |

Run `pnpm flux:schema:sync` after every `flux init` / hash change. Do **not** copy schema names from other projects.

## Environment files

```bash
# .env — commit secrets only via private copy; never commit real .env
FLUX_URL=https://api--myapp--abc1234.vsl-base.com
FLUX_GATEWAY_JWT_SECRET=...

# .env.local — generated; gitignored
FLUX_POSTGREST_SCHEMA=t_0123456789ab_api
```

Do not add `FLUX_POSTGREST_SCHEMA=` with an empty value to `.env`. It prevents `.env.local` from applying.

## JWT bridge (why `flux:doctor` exists)

Your app signs tokens in `lib/flux/jwt.ts`:

```ts
new SignJWT({ role: "authenticated" }).setSubject(session.user.id)
```

The gateway verifies that token with the **project** secret, then must re-sign for PostgREST with:

- `role`: `t_<12hex>_role`
- `sub`: same user id (for RLS)

If the gateway only forwards `authenticated`, PostgREST returns:

```json
{"code":"42501","message":"permission denied for schema t_…_api"}
```

`pnpm flux:doctor` **authenticated bridge probe** catches this before you debug Auth.js or RLS policies.

**Fix:** deploy Flux gateway with `mintBridgedTenantJwt()` (see `packages/gateway` in the Flux repo).

## Doctor output

```bash
pnpm flux:doctor
```

Checks include:

- `flux.json` and 7-char hash
- Hash / slug match control plane
- `apiSchema` present (v2)
- `.env.local` schema synced
- No empty schema override in `.env`
- `FLUX_URL` matches `flux list`
- Unauthenticated `GET /profiles` → 200
- Authenticated app JWT → not 403 schema denied

## When things fail

| Check | Action |
|-------|--------|
| `flux login` | `flux login` |
| `flux.json hash format` | Update hash from `flux list`; not a placeholder slug |
| `control plane apiSchema` | `flux push` / repair project on control plane |
| `FLUX_POSTGREST_SCHEMA synced` | `pnpm flux:schema:sync` after `flux login` |
| `authenticated bridge probe` | Deploy gateway bridge fix; confirm `FLUX_GATEWAY_JWT_SECRET` |
| `unauthenticated probe` | `flux push` grants migrations; confirm project Running |

## See also

- [`docs/FIRST_FORK.md`](FIRST_FORK.md) — fork checklist
- [`sql/migrations/README.md`](../sql/migrations/README.md) — migration order
- Flux upstream [`AGENTS.md`](https://github.com/justinkemersion/flux/blob/main/AGENTS.md) — pooled client pitfalls

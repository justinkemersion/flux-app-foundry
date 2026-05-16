# Flux integration contract

## HTTP boundary

All Flux / PostgREST HTTP must go through `lib/flux/client.ts` → `fluxJson(sub, path, init)`.

Do not call `fetch()` against `FLUX_URL` anywhere else (enforced by Vitest).

## JWT

- Mint per request via `mintFluxJwt(sub)` in `lib/flux/jwt.ts`.
- `sub` must equal `session.user.id` and row `user_id` columns.
- Do not store Flux JWTs in the browser session.

## Environment

| Variable | Purpose |
|----------|---------|
| `FLUX_URL` | PostgREST base URL |
| `FLUX_GATEWAY_JWT_SECRET` | HS256 signing secret |
| `FLUX_POSTGREST_SCHEMA` | `Accept-Profile` / `Content-Profile` — set via `pnpm flux:schema:sync` from `flux.json` |
| `FLUX_TLS_INSECURE` | Dev-only; `1` disables TLS verify |

## Resource helpers

Domain CRUD wrappers live in `lib/flux/<resource>.ts` and call `fluxJson` only.

## Errors

Catch `FluxHttpError` in server actions; return `{ ok: false, error: string }` to the client.

## Migrations

Schema changes are SQL files under `sql/migrations/` and pushed with Flux CLI (`flux push`).

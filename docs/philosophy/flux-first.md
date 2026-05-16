# Flux-first

PostgreSQL and RLS are the source of truth for multi-user data.

The Next.js app is a client of PostgREST through a single boundary: `lib/flux/client.ts`.

## Principles

- SQL-first schema and policies
- JWT `sub` aligned with `session.user.id` and row `user_id`
- No Flux HTTP in the browser
- Schema context via Flux CLI — not manual SQL templating

## No-shim principle

If Flux or PostgREST friction appears, improve the platform or document the gap.

Do not hide incompatibility in ad-hoc fetch wrappers scattered through the app.

Flux-first means the data plane stays boring so the UI can stay focused.

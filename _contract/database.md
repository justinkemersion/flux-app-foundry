# Database contract

## SQL-first

Prefer PostgreSQL constraints, indexes, and RLS over application-layer authorization.

## RLS invariant

Every tenant-scoped table must use this predicate on all policies:

```sql
(current_setting('request.jwt.claims', true)::json->>'sub') = user_id
```

## Policies

Each table needs SELECT, INSERT, UPDATE, DELETE policies for role `authenticated` unless documented otherwise.

## Grants

RLS alone is insufficient. Every migration tranche must `GRANT` table access to `authenticated` (see `*_grants.sql` files).

## Migrations

- Numbered files: `0001_*.sql`, `0002_*_grants.sql`, domain DDL, `*_grants.sql`
- Use **unqualified** table names; Flux applies migrations in the API schema context (`t_<hash>_api`)
- After `flux push`, run `pnpm flux:schema:sync` — never hand-edit schema names into SQL
- No `{{placeholders}}` in committed migration files

## Identifiers

- `user_id` is **text** (OAuth provider account id)
- Primary keys are `uuid` with `gen_random_uuid()` default

## Soft delete

Use `status` + `archived_at` for records; avoid hard DELETE in application flows.

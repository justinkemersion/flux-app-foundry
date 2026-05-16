# SQL migrations

## Schema context

Migrations use **unqualified** table names (`profiles`, `records`, …).

When you run `flux push`, the Flux CLI applies these files inside your project's API schema (`t_<hash>_api`). You do not edit SQL to inject schema names.

## Apply order

1. `0001_profiles.sql`
2. `0002_profiles_grants.sql`
3. `0004_core_entities.sql`
4. `0005_core_grants.sql`

## PostgREST profile

After `flux init` / `flux push`:

```bash
pnpm flux:schema:sync
```

This writes `FLUX_POSTGREST_SCHEMA` into `.env.local` from `flux.json` (never hand-edit SQL for schema names).

## Rules

- RLS invariant on every policy (see `_contract/database.md`)
- Separate `*_grants.sql` files
- No `{{placeholders}}` in committed SQL

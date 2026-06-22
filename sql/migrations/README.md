# SQL migrations

## Schema context

Migrations use **unqualified** table names (`profiles`, `records`, …).

When you run `flux push sql/migrations/`, the Flux CLI applies pending files inside your project's API schema (`t_<hash>_api`) and records each in `flux.flux_migrations`. You do not edit SQL to inject schema names.

## Apply (versioned ledger)

```bash
flux push sql/migrations/ --plan   # preview skip / apply / conflicts
flux push sql/migrations/          # apply pending migrations (preferred)
flux migrations list               # inspect remote ledger
```

For a single new file only: `flux push sql/migrations/NNNN_foo.sql --mode versioned`.

Do **not** run `flux push sql/migrations/0001_foo.sql` without `--mode versioned` — that defaults to **raw** (no ledger).

## File order

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
- Never edit a migration after it is in the ledger — add a new numbered file instead

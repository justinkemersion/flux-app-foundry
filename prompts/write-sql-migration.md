# Write SQL migration

1. Follow `_contract/database.md`.
2. Use RLS invariant on every policy.
3. Add separate `*_grants.sql` and `*_flux_api_schema.sql` files.
4. Apply via `flux push sql/migrations/ --plan` then `flux push sql/migrations/` (versioned ledger; never raw single-file push).
5. Run `pnpm flux:schema:sync` after push (do not add schema prefixes to SQL).
6. Extend `migration.rls.test.ts` for new files.

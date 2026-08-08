# Write SQL migration

1. Follow `_contract/database.md`.
2. Use the RLS invariant on every policy; for child tables, also enforce parent ownership (`EXISTS` on the parent row’s `user_id`).
3. Add a separate `*_grants.sql` when introducing new tables (schema-less / unqualified names — no `*_flux_api_schema.sql`).
4. Apply via `flux push sql/migrations/ --plan` then `flux push sql/migrations/` (versioned ledger; never raw single-file push).
5. Run `pnpm flux:schema:sync` after push (do not add schema prefixes to SQL).
6. Extend `migration.rls.test.ts` for new files.

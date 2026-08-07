# Create CRUD resource

1. Add SQL migration with RLS invariant + grants (unqualified names; parent-ownership checks for child tables).
2. Add types to `lib/flux/types.ts` and helpers in `lib/flux/<name>.ts`.
3. Add server actions with Zod validation and activity logging.
4. Add dashboard routes under `app/(dashboard)/`.
5. Update `sql/migrations/migration.rls.test.ts` if needed.
6. After `flux push sql/migrations/`, run `pnpm flux:schema:sync`.

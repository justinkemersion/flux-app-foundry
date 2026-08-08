# Database contract

## SQL-first

Prefer PostgreSQL constraints, indexes, and RLS over application-layer authorization.

## RLS invariant

Every tenant-scoped table must bind its rows to the JWT subject on all policies:

```sql
(current_setting('request.jwt.claims', true)::json->>'sub') = user_id
```

The **ownership column may be named anything** — `user_id`, `owner_user_id`, `member_user_id`, `created_by`. `pnpm foundry:status` discovers it from the comparison itself, so forks are not required to rename columns. Role/membership helper functions are also accepted when the helper's own body resolves the subject.

## Child-table ownership

Tables that reference a parent row (`record_id` → `records`, etc.) must also ensure the JWT `sub` owns that parent. Matching `user_id` alone is not enough: an attacker who knows another tenant's UUID must not be able to attach child rows.

Prove parent ownership with an `EXISTS` (or join, or resolvable helper) against the parent table using the same `sub` predicate. `0006_child_record_ownership.sql` is this repository's implementation, but **the requirement is the property, not the filename** — a fork may satisfy it in `0021_parent_ownership.sql` or any other number. Never renumber historical migrations to satisfy a check.

Writes that are not owner-bound **fail**. Unbound reads and unresolvable helper delegation are reported as `unknown` for manual review rather than silently passing.

## Policies

Each table needs SELECT, INSERT, UPDATE, DELETE policies for role `authenticated` unless documented otherwise.

## Grants

RLS alone is insufficient. Every migration tranche must `GRANT` table access to `authenticated` (see `*_grants.sql` files).

## Migrations

- Numbered files: `0001_*.sql`, `0002_*_grants.sql`, domain DDL, `*_grants.sql`
- Use **unqualified** table names; Flux applies migrations in the API schema context (`t_<hash>_api`)
- Apply with **`flux push sql/migrations/`** (versioned ledger); see `_contract/flux-workflow.md`
- After push, run `pnpm flux:schema:sync` — never hand-edit schema names into SQL
- No `{{placeholders}}` in committed migration files

## Identifiers

- `user_id` is **text** (OAuth provider account id)
- Primary keys are `uuid` with `gen_random_uuid()` default

## Soft delete

Use `status` + `archived_at` for records; avoid hard DELETE in application flows.

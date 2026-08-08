# 015 — Semantic (fork-aware) security invariants

Correction pass on the unreleased 0.6.0 baseline. A read-only sweep of 17 local Flux-derived repositories showed the security invariants were measuring the *template layout* rather than the *security properties*, so their verdicts could not be trusted for any real fork.

## Scope

- CI: one authoritative pnpm version source (`packageManager`), guarded by `check:contracts`
- Replace filename/text matching with structural SQL policy analysis
- Discover ownership columns from the comparison against the JWT subject
- Detect Flux boundary violations from Flux evidence, not from the presence of `fetch()`
- Three-state verdicts (`pass` / `fail` / `unknown`) so unprovable cases surface for review
- Capability-based baseline metadata + `capability:` pattern anchors
- Regression fixtures pairing vulnerable and protected shapes

## Out of scope

- Any downstream application change (fleet adoption is a separate, later pass)
- Deploy, secret rotation, live database mutation
- Broad CI rewrite

## Why the invariants were untrustworthy

| Invariant | Old implementation | Consequence on real forks |
|---|---|---|
| `security-migrations-present` | required `sql/migrations/0006_child_record_ownership.sql` | every fork failed; slot 0006 is normally domain migration history |
| `child-row-parent-ownership` | read that one file and grepped for `from records r` | could not see protection implemented anywhere else, and could not see a real defect |
| `tenant-rls-jwt-sub` | counted occurrences of `…->>'sub') = user_id` | `owner_user_id` / `created_by` ownership models reported as missing RLS |
| `no-raw-flux-fetch` | flagged any `fetch(` outside `lib/flux/client.ts` | Open-Meteo, NWS and Workers AI calls reported as Flux boundary violations |

## Checklist

- [x] Drop `version:` from `pnpm/action-setup` in both workflows
- [x] Guard the pnpm version conflict in `scripts/validate-contracts.mjs`
- [x] Add `scripts/lib/sql-policy-analysis.ts` (statements, tables, FKs, policies, functions)
- [x] Add `scripts/lib/flux-access-analysis.ts` (evidence-based boundary detection)
- [x] Rewrite `scripts/lib/security-invariants.ts` around both analyzers
- [x] Add `unknown` to `SecurityCheck` and thread it through status/compat/doctor
- [x] Replace `securityBaseline.requiredMigrations` with `requiredCapabilities` + `ownership`
- [x] Remove `sql/migrations/*` from `requiredPaths` (fingerprints still track provenance)
- [x] Add `capability:` anchors to `fixtures/reference-app/patterns.json`
- [x] Add nine regression fixtures under `fixtures/reference-app/security/`
- [x] Add `lib/foundry/security-analyzer.test.ts`
- [x] Add a renumbered-migration fixture to `foundry:golden-app`
- [x] Update `_contract/database.md`, `_contract/forking.md`, `_contract/anti-drift.md`, `docs/REFERENCE_APP.md`, `docs/BASELINE_CHANGELOG.md`
- [x] Verify Pass 6b privileges against a disposable Postgres container

## Version decision

Stay on **0.6.0**. PR #6 is unmerged and the fleet sweep confirmed no downstream repository carries `foundry.baseline.json`, so 0.6.0 has never been released or adopted. This corrects the implementation of an unreleased version; a 0.6.1 would imply a migration path from a 0.6.0 that never existed in the wild.

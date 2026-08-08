# Foundry baseline changelog

Concise release notes keyed to `foundry.baseline.json` → `baselineVersion`.  
When security or Foundry-owned contracts change, add an entry here **and** bump `baselineVersion`, then run `pnpm foundry:baseline:stamp`.

Forks: read the entry for each skipped version and apply the listed sync steps.

## 0.6.0 — 2026-08-08

**Theme:** Canonical reference app / compatibility harness, with semantic (fork-aware) security invariants.

> 0.6.0 has not been released; the notes below fold in the invariant correction made before merge. There is no 0.5.x → 0.6.0-preview upgrade path to worry about.

### Security invariants are now semantic

Checks assert security *properties* and never key off a migration filename:

| Old behaviour | New behaviour |
|---|---|
| `security-migrations-present` required `sql/migrations/0006_child_record_ownership.sql` | removed; capabilities are declared in `securityBaseline.requiredCapabilities` |
| `child-row-parent-ownership` read one hard-coded file | analyzes FK graph + policy expressions under any filename |
| `tenant-rls-jwt-sub` grepped for `= user_id` | discovers the ownership column from the comparison (`owner_user_id`, `created_by`, …) |
| `no-raw-flux-fetch` banned every `fetch()` outside `lib/flux/client.ts` | replaced by `no-browser-flux-access`, which requires Flux evidence (config symbol / boundary import) |

Checks now report `pass`, `fail`, or `unknown`. `unknown` means static analysis could not prove the property — it surfaces for manual review and never counts as a pass.

### Downstream forks must

1. Pull Foundry-owned paths (especially `fixtures/reference-app/`, `scripts/foundry-compat.ts`, `scripts/lib/reference-*.ts`, CI workflow, security invariants already on 0.5.x).
2. Run `pnpm foundry:compat` (and keep `pnpm foundry:verify:template` / `pnpm foundry:golden-app` green).
3. Update fork `foundry.baseline.json` / `FOUNDRY_BASELINE.md` sync metadata — do not re-stamp casually.
4. Treat Flux-core live items (`live-jwt-bridging-semantics`, `live-unauth-gateway-contract`, `live-schema-rewrite-v2`) as pending unless your environment explicitly runs `--live` probes.
5. Do **not** adopt a parallel `_compat/reference-app` tree — that alternate layout was discarded; the only canary is `fixtures/reference-app/`.
6. Do **not** renumber or rename existing migrations to satisfy a security check. Add a new numbered migration that establishes the missing property.

### Added

- `fixtures/reference-app/` capability manifest + pattern anchors + domain canaries + negative fixtures
- `pnpm foundry:compat` / `foundry:reference:verify`
- CI step for the reference harness (after `foundry:golden-app`)
- This changelog convention
- `scripts/lib/sql-policy-analysis.ts` — structural RLS/FK/policy analysis
- `scripts/lib/flux-access-analysis.ts` — evidence-based Flux boundary detection
- `fixtures/reference-app/security/` — vulnerable vs protected regression fixtures
- `capability:` pattern anchors in `patterns.json`
- `securityBaseline.ownership` escape hatch (`additionalOwnershipColumns`, `exemptTables`)

### Fixed

- CI: `pnpm/action-setup` no longer pins a version; `package.json` `packageManager` is the single source (the duplicate declaration aborted every run). `pnpm check:contracts` now guards against the regression.

### Why 0.6.0

Introduces a new Foundry-owned compatibility surface and required scripts/paths. Forks syncing past 0.5.x must pull the harness and keep `foundry:compat` green.

## 0.5.0 — 2026-08-07

**Theme:** Baseline lifecycle (versioning, status, golden-app, security invariants).

### Downstream forks must

1. Adopt `foundry.baseline.json` (legacy forks report `unknown` until they do).
2. Keep security migrations through `0006_child_record_ownership.sql`.
3. Run `pnpm foundry:status` and `pnpm foundry:golden-app` expectations via upstream CI patterns.

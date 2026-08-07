# Foundry baseline changelog

Concise release notes keyed to `foundry.baseline.json` → `baselineVersion`.  
When security or Foundry-owned contracts change, add an entry here **and** bump `baselineVersion`, then run `pnpm foundry:baseline:stamp`.

Forks: read the entry for each skipped version and apply the listed sync steps.

## 0.6.0 — 2026-08-07

**Theme:** Canonical reference app / compatibility harness.

### Downstream forks must

1. Pull Foundry-owned paths (especially `fixtures/reference-app/`, `scripts/foundry-compat.ts`, `scripts/lib/reference-compat.ts`, CI workflow, security invariants already on 0.5.x).
2. Run `pnpm foundry:compat` (and keep `pnpm foundry:verify:template` / `pnpm foundry:golden-app` green).
3. Update fork `foundry.baseline.json` / `FOUNDRY_BASELINE.md` sync metadata — do not re-stamp casually.
4. Treat Flux-core live items (`live-jwt-bridging-semantics`, `live-unauth-gateway-contract`, `live-schema-rewrite-v2`) as pending unless your environment explicitly runs `--live` probes.

### Added

- `fixtures/reference-app/` capability manifest + ownership docs
- `pnpm foundry:compat` / `foundry:reference:verify`
- CI step for the reference harness
- This changelog convention

## 0.5.0 — 2026-08-07

**Theme:** Baseline lifecycle (versioning, status, golden-app, security invariants).

### Downstream forks must

1. Adopt `foundry.baseline.json` (legacy forks report `unknown` until they do).
2. Keep security migrations through `0006_child_record_ownership.sql`.
3. Run `pnpm foundry:status` and `pnpm foundry:golden-app` expectations via upstream CI patterns.

# Foundry baseline changelog

Concise release notes keyed to `foundry.baseline.json` → `baselineVersion`.  
When security or Foundry-owned contracts change, add an entry here **and** bump `baselineVersion`, then run `pnpm foundry:baseline:stamp`.

Forks: read the entry for each skipped version and apply the listed sync steps.

## 0.6.1 — 2026-08-08

**Theme:** Safe opt-in error pass-through, and an `action-errors-no-leak` check that judges shape instead of imports.

### Why

The fleet audit found `action-errors-no-leak` failing in **every** fork. The inherited shape was:

```ts
if (error instanceof Error) return { ok: false, error: error.message };
```

`FluxHttpError` is `(message, status, body)` and embeds the Flux status line and response body in its message, so that branch rendered Flux internals straight into the browser.

Three forks (`noisydesign`, `parcelpop`, `yeast-coast-2`) could not simply adopt the sanitizing version, because they intentionally use `throw new Error("...")` to carry real domain messages to users ("Alt text is required before publishing a frame."). Sanitizing unconditionally would have replaced those with "Something went wrong" — trading a security leak for a UX regression. `UserFacingError` resolves that without weakening the boundary.

### Added

- `UserFacingError` in `lib/flux/errors.ts` — an explicit, opt-in marker for messages that are safe to show the user. `actionError` passes its message through verbatim; everything else is still sanitized. Never construct it from a Flux response or other untrusted string.
- `classifyActionErrorSource()` exported from `scripts/lib/security-invariants.ts` — the pure form of the check, so fixtures can exercise it directly.
- `fixtures/reference-app/security/action-error-leaks.fixture.ts.txt` and `action-error-user-facing.fixture.ts.txt` — vulnerable vs protected canaries.

### Fixed

- `action-errors-no-leak` was **presence-only**: it looked for `FluxHttpError`, `"Request failed. Please try again."`, and `"Unauthorized"` as substrings. A file could import every sanitization symbol, keep the raw-message leak, and still pass. It now fails any generic `instanceof Error` branch that returns a raw `.message` to the client, while deliberately allowing narrowings to a specific subclass so the `UserFacingError` pass-through stays legal.

### Downstream forks must

1. Sync `lib/flux/errors.ts` and `lib/actions/result.ts`.
2. Replace intentional user-facing `throw new Error(...)` in the action layer with `throw new UserFacingError(...)`. Anything left as a plain `Error` will correctly collapse to "Something went wrong".
3. Re-run `pnpm foundry:status` — forks that adopted 0.6.0's `result.ts` verbatim stay secure; this is additive.

### Why 0.6.1

Additive and non-breaking. No migration, contract, or script-name changes; only the Foundry-owned error boundary and the strengthened invariant.

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

# Flux + Foundry relaunch — completion ledger

Rewritten on every loop iteration. **Historical entries are evidence, not authorization.**
Every value below was produced by a read-only check at the time shown; re-run the check
before acting on it.

Last updated: 2026-08-08, end of iteration 1.

## Operating notes learned this iteration

- **Never export `DOCKER_HOST` into a shared shell.** `fluxControlPlaneTargetIsRemoteEngine()`
  in `packages/core/src/tenant-catalog-urls.ts` flips tenant API URLs from `http` to `https`
  whenever `DOCKER_HOST` points at a remote engine. Exporting it for the reconcile run caused a
  false test failure in `provisioning-engine.test.ts`. Scope production docker env to the one
  command that needs it.
- **The shell is zsh, which does not word-split unquoted variables.** A built-up `$ROOTS`
  string collapses to a single argument; the analyzer then silently audits a bogus concatenated
  path. This produced one entirely false fleet row before it was caught. Pass paths explicitly.
- `pnpm build` is *not* the sanctioned Foundry build gate. Use `foundry:verify:template`
  (no `.env`, CI stub env) or `foundry:verify` (fork, real `.env`). A bare `pnpm build` fails on
  `No auth providers configured` by design — fail-closed auth, not a defect.
- Retargeting a PR's base does **not** trigger CI (`edited` is not in the default
  `pull_request` trigger set). Close + reopen to fire `reopened`.

## Stage 1 — platform merge: COMPLETE

**Flux** — `main` @ `460a4aa`, CI green.
- PR #7 merged (squash). PR #3 closed as superseded with evidence: its unique file
  `packages/gateway/src/app-auth-contract.test.ts` had its coverage re-implemented and
  *strengthened* in `app.test.ts` (adds invalid-Bearer case, asserts `proxyCalled === false`).
- Verified: `check:architecture` pass, `typecheck` clean, `pnpm test` **778 pass / 0 fail / 2 skipped**.
- Pass 6b integration on disposable `postgres:16` (`DOCKER_HOST` unset): **13/13 pass**, container removed.
- Gateway contract deliberately left at `1.0.0` — `460a4aa` fixes rewriting correctness without
  changing any of the four declared invariants.

**Foundry** — `main` @ `e90a12a`, CI green, baseline **0.6.0**.
- PR #7 retargeted to `main` and merged **with a merge commit** (not squash): the baseline pins
  `sourceCommit: 449fe824`, which squashing would have made unreachable. Verified still reachable.
- PRs #2/#3/#4/#6 closed — each verified at 0 commits ahead of `main`.
- PR #5 closed as superseded *by design*: it introduced the parallel `_compat/` framework that
  `AGENTS.md` rule 9 forbids. Verified `_compat/` absent, `fixtures/reference-app/` present.
- Verified: `foundry:status` current, 82/82 fingerprints, all 6 invariants pass, no drift;
  `foundry:verify:template` pass incl. build; `foundry:golden-app` pass **including negative
  canaries** (insecure fixture correctly fails, renumbered fixture correctly retains
  capabilities — proving invariants are semantic, not filename-based); `foundry:compat`
  localFailed=0 / livePending=3; vitest 61/61.
- Both platform repos now have **zero open PRs**.

## Stage 2 — inherited child-ownership: COMPLETE for all reachable forks

**Correction to the original assumption:** the inherited `notes`/`record_tags` defect was
already remediated in all 9 clean forks' branches. Stage 2 was a *merge* problem, not an
authoring problem.

Root blocker was CI, not SQL: `pnpm/action-setup@v4` aborts when its `version: 10` input
disagrees with `packageManager: pnpm@10.33.0`, killing every run in 5–9s before install.
Fixed via a **separate focused** `ci/pnpm-single-source` PR per repo (+2/−4, workflows only),
kept out of the security PRs per scope discipline. Resulting `dependency-check.yml` blob
`869a6f1` is byte-identical to Foundry's upstream fix.

8 CI PRs merged; 8 security PRs merged. Verified post-merge with the semantic analyzer.

Remediation variants confirmed structurally (not pattern-matched):
- `living-language` — collapses the obsolete `*_tenant` duplicate family via a new migration,
  recreating portable `TO authenticated` policies with `EXISTS` parent binding.
- `vessel-ledger` — deliberately no-`TO` (PUBLIC), documented: no
  `GRANT authenticated TO t_<12hex>_role` bridge exists, so `TO PUBLIC` is what reaches the
  runtime role. **Safe but non-canonical**; retained rather than rewritten.

## Stage 4 — action-error leakage: PARTIALLY COMPLETE (5 of 8)

Confirmed inherited template defect. The fork implementation returned `error.message`
**verbatim** for any `Error`; since `FluxHttpError(message, status, body)` embeds the Flux
status line and response body in its message, Flux internals rendered straight into client UI.

Adoption pattern (proven in `lighthouse` first, then replicated): move `UnauthorizedError` to
`lib/flux/errors.ts`, re-export from `lib/flux/auth.ts` (keeps all import sites working and
keeps next-auth out of the unit test graph), replace `result.ts` with type-directed
sanitization, add a 5-case regression test — including an assertion that the **server-side
log still fires**, so client detail is hidden without blinding the operator.

Merged: `lighthouse` `4d94b8b`, `casa-panel` `5e96d2d`, `living-language` `25872a9`,
`roommating` `a71c9ff`, `vessel-ledger` `6a4d40a`.

**Deliberately excluded — intentional user-facing messages.** The per-repo safety check found
three forks that rely on `throw new Error("...")` to carry real domain messages to users.
Applying the canonical fix unmodified would replace them with "Something went wrong", a UX
regression. Awaiting a decision rather than regressing them:

| Repo | Count | Examples |
|---|---|---|
| `noisydesign` | 26 | "Choose an image to upload", "Alt text is required before publishing a frame." |
| `yeast-coast-2` | 14 | `parsed.error.issues[0]?.message`, "Variant not found" |
| `parcelpop` | 6 | "Refresh rate limited — wait a few seconds and try again." |

## Current fleet invariant state (verified this iteration)

| Repo | notes/record_tags | action-errors | Browser Flux | Residual |
|---|---|---|---|---|
| `vessel-ledger` | fixed | fixed | pass | **all 6 invariants pass** |
| `lighthouse` | fixed | fixed | pass | 2 analyzer `unknown` |
| `living-language` | fixed | fixed | pass | 1 analyzer `unknown` |
| `casa-panel` | fixed | fixed | pass | app-specific `panels`->`locations` |
| `roommating` | fixed | fixed | pass | app-specific `household_members`->`households` |
| `parcelpop` | fixed | **pending** | pass | 1 analyzer `unknown` |
| `noisydesign` | fixed | **pending** | pass | app-specific `photo_assets`->`photos` |
| `yeast-coast-2` | fixed | **pending** | pass | app-specific `recipe_variants`->`recipe_families` |
| `balance` | fixed | **blocked** | pass | app-specific `meal_components`->`meal_entries` |

**Residual `child-row-parent-ownership` failures are app-specific domain pairs, NOT the
inherited Foundry defect.** Catalogued, not auto-fixed, per instruction.

### balance — BLOCKED, needs a decision
The pnpm fix worked (6s -> 59s), revealing a **pre-existing** anti-drift failure underneath,
identical on `origin/main` and the security branch:
- `components/add/MealQuickAdd.tsx` — 275 lines (max 250)
- `lib/ai/meal-draft.ts` — 507 lines (max 400)

`balance` CI has been red on `main` since 2026-07-22. No sanctioned file-size exception exists
(`_drift/` holds only `dependency-exceptions.md`; the `skip` list in `check-file-sizes.mjs` is
Foundry-owned, so whitelisting app files there would be a shim). The only honest path to green
is refactoring two app-owned domain files — outside the scope set for this loop.
Its CI-fix PR **#3 remains open and unmerged**.

### casa-panel — local/remote divergence, left alone
Local `main` @ `3309e75` carries **1 unpushed user commit**
(`fix(auth,shell): stale JWT sessions and sidebar active state`). Not pulled, not pushed, not
rebased. Remote `main` has both fixes and green CI; that repo was verified via remote CI
instead of the local tree.

## Stage 6 — deployment-sensitive exceptions

**logos-engine — DEFERRED (dirty), read-only diagnosis complete. NOT a deploy blocker.**
Root cause is `grant anon to t_744b22df8382_role` in `0013_public_read_grants.sql`: the runtime
role is a *member* of `anon`, so restrictive `TO anon` policies also apply to editorial writes.
Migrations `0019`–`0026` are successive failed workarounds ending in RLS being disabled on
`ai_runs`, `translation_layers`, `translation_variants`.

Production tenant `t_744b22df8382_api` already reports `UNFORCED=0` / `RT_OWNED=0`, so FORCE
RLS and DDL ownership are **already live** there — the editorial promotion breakage is
pre-existing, not introduced by the pending deploy. Recommended fix (owner's call, not this
loop): revoke `anon` from the runtime role and give the public reader a non-inheriting path.
Migrations `0020`–`0026` are **untracked**, so there is no committed record. Tree untouched.

**Real browser Flux boundary exposure** is confined to the 4 dirty/deferred repos:
`flux-control-room`, `habitat` (`lib/flux/flux-request.ts`), `theshelf`, `logos-engine`.
All 8 processed forks PASS `no-browser-flux-secrets`.

**Analyzer `unknown`s** still open on `tenant-rls-jwt-sub` / `child-row-parent-ownership`:
`lighthouse` (both), `living-language`, `parcelpop`, `yeast-coast-2`. Must be resolved before
the Stage 7 gate if they materially affect deployment safety.

## Production state — verified read-only 2026-08-08

`bin/pass6b-reconcile-tenant-roles.sh`:
- **19 catalogued schemas: `DDLROLE=yes`, `RT_OWNED=0`, `UNFORCED=0`, `AUTHUSG=yes`.**
  Pass 6b backfill complete and healthy; Stage 8's precondition is satisfied.
- 8 orphan schemas uncatalogued and `postgres`-owned. Only `t_b86da057199a_api` holds objects
  (2 tables, `UNFORCED=2`). Deliberately not adopted.
- Server `/srv/platform/flux` was at `6ab8984`; `main` is now `460a4aa`, so the Flux code
  deploy is **still pending**.
- `catalogued=19 present=27` — the Pass 6b plan doc says 17; two projects were added since.
  Re-derive, never assume.

## Deferred / blocked

| Repo | Status | Reason |
|---|---|---|
| `flux-control-room` | DEFERRED | dirty (25 files); inherited `record_tags` + `NEXT_PUBLIC_FLUX_URL` |
| `habitat` | DEFERRED | dirty (3 untracked); same two defects |
| `theshelf` | DEFERRED | dirty (6 files); has core tables but **no** child-ownership migration |
| `logos-engine` | DEFERRED | dirty (33 files), by explicit decision; diagnosis above |
| `balance` | BLOCKED | pre-existing anti-drift LOC violations in app-owned files |
| `noisydesign`, `parcelpop`, `yeast-coast-2` | PENDING DECISION | intentional user-facing error messages |

## Stages not yet started

5 (baseline adoption), 7 (gate), 8 (Flux deploy), 9 (live verify on a brand-new disposable
tenant), 10 (app relaunch), 11 (final sweep).

---

## Iteration 2026-08-08 (later) — Stage 4 completion + balance unblock

All states below were re-verified read-only immediately before acting, per the standing rule.

### Foundry upstream: `UserFacingError` (baseline 0.6.1)

PR #8 merged (`effcd85`), CI green. `main` CI green after merge.

- `lib/flux/errors.ts` is now the canonical home for `UnauthorizedError` + `UserFacingError`.
- `actionError` sanitizes by class and passes `UserFacingError` messages through verbatim.
- `action-errors-no-leak` now judges by *shape* (`classifyActionErrorSource`), so a
  `UserFacingError` pass-through stays legal while a generic `instanceof Error → .message`
  branch still fails. Fixtures cover both directions.
- Baseline stamped 0.6.1; `docs/BASELINE_CHANGELOG.md` records the bump.

### balance — unblocked and fully green

CI had been red since 2026-07-22. Root cause was two-layered, and the second layer only
became visible once the first was fixed:

1. `pnpm/action-setup` `version: 10` conflicted with `packageManager` → install never ran.
2. With install fixed, `check:file-sizes` failed on two app-owned files over the anti-drift
   limits (`MealQuickAdd.tsx` 275/250, `lib/ai/meal-draft.ts` 507/400).

Landed as three focused PRs, in this order, because the refactor needed the workflow fix to
get a real CI signal:

| PR | Change | Evidence |
|---|---|---|
| #3 | workflow-only pnpm fix | merged; its only failure was the pre-existing LOC violation |
| #4 | refactor split by responsibility | **first green run since 2026-07-22** |
| #2 | `0038_harden_child_record_ownership.sql` + drop `NEXT_PUBLIC_FLUX_URL` fallback | green, merged |

The refactor was pure extraction — no behavior, prompt text, or public API change;
`@/lib/ai/meal-draft` still re-exports its whole surface. `main` is now `65ad1b3`, green.

### Stage 4 propagation — the three forks with intentional user-facing copy

Per the chosen approach: sanitize by class, convert intentional throws to `UserFacingError`.

| Repo | PR | Converted | Also fixed | State |
|---|---|---|---|---|
| `noisydesign` | #4 | 26 domain throws in dashboard actions + `validate-image.ts` | — | merged, `6082b66` |
| `yeast-coast-2` | #10 | 14 action throws + media/brewing services + `"That handle is already taken"` | `lib/export/export-response.ts` 500 branch leaked | merged, `f4794e1` |
| `parcelpop` | #3 | upload/media/favorites/rate-limit messages | **six** app-authored copies of the leak | CI pending |

`parcelpop` was materially worse than the template defect suggested: it had replicated
`error instanceof Error ? error.message : "..."` into saved articles, upload intents, the
member upload route, the weather sync endpoint (POST + GET), and three studio weather actions
that call `fluxJson` directly. All now route through the single `actionError` classification;
`lib/actions/route-error.ts` is a thin status mapping over it rather than a second sanitizer.
The upload route's 413/415 statuses are preserved by deriving them only from
`UserFacingError` messages instead of substring-matching arbitrary error text.

In every fork, `lib/flux/*` `": empty response"` diagnostics and missing-env/config messages
were deliberately left as plain `Error` so they are sanitized.

### New finding — `noisydesign` RLS case 8 fails against live Flux

`sql/migrations/noisydesign.rls.integration.test.ts` case 8 ("unlisted rows are not
enumerable but resolve via RPC") fails on **unmodified `main`**: the RPC returns 200 with an
empty array instead of the unlisted photo. Confirmed pre-existing by running it on a clean
checkout, so it is not a regression from the action-error work. It is env-guarded
(`hasFluxEnv`), so CI skips it and no fork CI is red because of it.

Carried into Stage 9 as a live-Flux question, not a code defect: most likely the RPC is
absent or unprivileged in the live tenant schema. Do not treat Stage 9 as passing until this
is explained.

### Deferred / blocked — refreshed

| Repo | Status | Reason |
|---|---|---|
| `flux-control-room` | DEFERRED | dirty (25 files); inherited `record_tags` + `NEXT_PUBLIC_FLUX_URL` |
| `habitat` | DEFERRED | dirty (3 untracked); same two defects |
| `theshelf` | DEFERRED | dirty (6 files); core tables but **no** child-ownership migration |
| `logos-engine` | DEFERRED | dirty (33 files), by explicit decision |

`balance` is no longer blocked. `noisydesign` / `yeast-coast-2` / `parcelpop` are no longer
pending a decision.

### Not yet started

5 (baseline adoption — note `parcelpop` has no `foundry.baseline.json` at all), 7 (gate),
8 (Flux deploy), 9 (live verify on a brand-new disposable tenant), 10 (app relaunch),
11 (final sweep).

---

## Fleet security audit — re-run 2026-08-08 against `origin/main` of every fork

Method: throwaway `git worktree` per repo at `origin/main`, analyzer run against those trees.
This avoids reading stale local checkouts and leaves dirty/diverged working trees untouched.
Fork set derived by presence of `lib/flux/client.ts` (15 repos, including Foundry itself).

### Two repos were not in the previous picture at all

- **`percept`** — a Foundry fork that had never been audited. `action-errors-no-leak` fails
  because `lib/actions/result.ts` is *absent*, `fail-closed-auth-helper` fails ("no fail-closed
  auth helper found"), and `lib/flux/client.ts` references `NEXT_PUBLIC_FLUX_*`. It has no
  tenant SQL the analyzer can evaluate.
- **`casa-panel`** — local `main` had **diverged**: 1 unpushed local commit
  (`3309e75 fix(auth,shell): stale JWT sessions and sidebar active state.`) against 3 unpulled
  remote commits (the security + CI work merged earlier). Left untouched; needs an owner
  decision before anything else happens in that repo.

### Newly proven scope: child-ownership on app-specific tables

The earlier fleet fix covered the **inherited** `notes` / `record_tags` pair from
`0004_core_entities.sql`. The analyzer, run with full notes rather than just the first
finding, shows the same defect class on **app-authored** parent/child tables that were never
in scope:

| Repo | proven policy FAILs | REVIEW | example |
|---|---|---|---|
| `habitat` | 132 | 44 | (deferred, dirty) |
| `theshelf` | 58 | 20 | (deferred, dirty) |
| `yeast-coast-2` | 58 | 39 | `recipe_variants.family_id -> recipe_families` |
| `noisydesign` | 54 | 36 | `photo_assets.photo_id -> photos`, `roll_photos.roll_id -> rolls` |
| `casa-panel` | 36 | 12 | `panels/panel_sections/modes/rules/house_notes` |
| `balance` | 27 | 9 | `meal_components`, `saved_meal_components`, `recipe_ingredients`, `routine_*` |
| `flux-control-room` | 15 | 5 | (deferred, dirty) |
| `roommating` | 15 | 5 | `household_members.household_id -> households` |
| `logos-engine` | 13 | 12 | (deferred, by decision) |

Counts are per policy (insert/update/delete), so distinct table→parent links are roughly a
third of each number. Verified against source, not taken on trust:
`meal_components.meal_entry_id references meal_entries` with
`meal_components_insert ... with check ((jwt.sub) = user_id)` only, and
`photo_assets.photo_id references photos` likewise. These are real, not analyzer artifacts.

Exploit shape: an authenticated caller inserts a child row carrying **their own** `user_id`
but a `parent_id` belonging to another tenant. Reads stay filtered by `user_id`, so this is
not a direct read breach, but it lets a caller inject rows under another tenant's parent —
and app read paths fetch children by `parent_id` for the parent's owner, so injected rows can
surface in the victim's UI. Cross-tenant integrity, release-blocking class.

### `lighthouse` UNKNOWNs are an analyzer limitation, not a defect

`lighthouse` shows 0 FAIL and 140 REVIEW. Its policies delegate to
`lighthouse_is_org_member(organization_id)` / `lighthouse_has_org_role(...)` helper functions
(`0006`, `0010`, `0039`), which the analyzer cannot resolve through a function body. The
org-membership model is arguably stronger than per-row `user_id`. `living-language` (4) and
`parcelpop` (27) REVIEWs are the same shape. These should be confirmed by reading the helpers,
but they are **not** in the proven-failure class above.

### `balance` action-error gap closed

`balance`'s `lib/actions/result.ts` was still the vulnerable template — the earlier ledger
implied a PR existed, and none did. That is the *inherited* defect and squarely in the
sanctioned Stage 4 scope, so it was fixed the same way as the other forks (PR #5, 13 domain
throws converted to `UserFacingError`).

### Current invariant state on `origin/main`

| Repo | tenant-rls | child-own | browser-access | browser-secrets | action-errors | auth-helper |
|---|---|---|---|---|---|---|
| `flux-app-foundry` | PASS | PASS | PASS | PASS | PASS | PASS |
| `vessel-ledger` | PASS | PASS | PASS | PASS | PASS | PASS |
| `parcelpop` | unknown | PASS | PASS | PASS | PASS | PASS |
| `living-language` | unknown | PASS | PASS | PASS | PASS | PASS |
| `lighthouse` | unknown | unknown | PASS | PASS | PASS | PASS |
| `balance` | PASS | **FAIL** | PASS | PASS | PASS (PR #5) | PASS |
| `noisydesign` | PASS | **FAIL** | PASS | PASS | PASS | PASS |
| `yeast-coast-2` | unknown | **FAIL** | PASS | PASS | PASS | PASS |
| `roommating` | PASS | **FAIL** | PASS | PASS | PASS | PASS |
| `casa-panel` | PASS | **FAIL** | PASS | PASS | PASS | PASS |
| `percept` | unknown | unknown | PASS | **FAIL** | **FAIL** | **FAIL** |
| `flux-control-room` | PASS | **FAIL** | PASS | **FAIL** | **FAIL** | PASS |
| `habitat` | PASS | **FAIL** | PASS | **FAIL** | **FAIL** | PASS |
| `theshelf` | PASS | **FAIL** | PASS | **FAIL** | **FAIL** | PASS |
| `logos-engine` | **FAIL** | **FAIL** | PASS | **FAIL** | **FAIL** | PASS |

Stage 7's gate cannot honestly pass while the app-specific child-ownership failures stand.
Escalated rather than improvised: remediating ~130 table→parent links across 9 repos is a
cross-repo security program, not a finishing step, and `plans/` discipline forbids inventing
it unilaterally.

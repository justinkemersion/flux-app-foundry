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
| `noisydesign` | fixed | fixed (`0018`, merged `6b11d9c`) | pass | app-specific `photo_assets`->`photos` |
| `yeast-coast-2` | fixed | fixed (`0027`, merged `67f1375`) | pass | app-specific `recipe_variants`->`recipe_families` |
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
| `yeast-coast-2` | 58 → **9** (fixed, PR #11) | 39 | `recipe_variants.family_id -> recipe_families` |
| `noisydesign` | 54 → **3** (fixed, PR #5) | 36 | `photo_assets.photo_id -> photos`, `roll_photos.roll_id -> rolls` |
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
| `noisydesign` | PASS | PASS† (PR #5) | PASS | PASS | PASS | PASS |
| `yeast-coast-2` | unknown | PASS† (PR #11) | PASS | PASS | PASS | PASS |
| `roommating` | PASS | **FAIL** | PASS | PASS | PASS | PASS |
| `casa-panel` | PASS | **FAIL** | PASS | PASS | PASS | PASS |
| `percept` | unknown | unknown | PASS | **FAIL** | **FAIL** | **FAIL** |
| `flux-control-room` | PASS | **FAIL** | PASS | **FAIL** | **FAIL** | PASS |
| `habitat` | PASS | **FAIL** | PASS | **FAIL** | **FAIL** | PASS |
| `theshelf` | PASS | **FAIL** | PASS | **FAIL** | **FAIL** | PASS |
| `logos-engine` | **FAIL** | **FAIL** | PASS | **FAIL** | **FAIL** | PASS |

† `noisydesign` and `yeast-coast-2` still emit 3 and 9 analyzer FAILs respectively. Every one is a
deliberate design choice recorded under "Class B remediation": edges enforced by composite foreign
keys, which the analyzer cannot see, and owner-only deletes on the social tables. The exploits
themselves are proven closed. The analyzer needs the foreign-key rule taught to it before these can
read as a clean PASS — folded into the `analyzer_precision` follow-up.

Stage 7's gate cannot honestly pass while the app-specific child-ownership failures stand.
Escalated rather than improvised: remediating ~130 table→parent links across 9 repos is a
cross-repo security program, not a finishing step, and `plans/` discipline forbids inventing
it unilaterally.

## Iteration — child-ownership triage, corrected severity model

The 408 `child-row-parent-ownership` failures are **not one defect**. Reading the policies
alongside how each child table is *read* splits them into three classes with very different
consequences. The analyzer reports all three identically, so its raw count cannot serve as the
Stage 7 gate.

### Class A — cross-tenant read breach (`roommating`) — FIXED

`0006` authorized `household_members` writes with `(jwt.sub) = user_id` **or** an owner check.
The first branch is satisfied by any caller inserting a row carrying their own `user_id` with an
arbitrary `household_id`, so anyone could join any household. Every other table here authorizes
by membership, so self-joining escalated into read access to that household's chores, bills,
settlements, and activity. `household_members_update` allowed self-promotion to `owner`.

Fixed in `0009_household_membership_authority.sql` (PR #5, merged, `main` = `879694b`): all
three write policies now prove authority against the parent `households` row. That matches the
app — `createHousehold` writes the creator's owner row right after the household it owns,
`addHouseholdMember` is owner-only and always writes `role = 'member'`, and nothing promotes.

`chores`, `house_bills`, `settlements`, `house_activity` were **deliberately left alone**. Their
write policies already require household membership, which *is* this app's parent-ownership
proof. Tightening them to `households.user_id` would lock every non-owner member out of a
shared household. The analyzer still reports those 12 as FAIL — it cannot equate a
junction-table membership proof with ownership of the parent row.

### Class B — public content injection (`noisydesign`, `yeast-coast-2`) — HIGH, FIXED

> **Resolved 2026-08-09.** Both exploits were reproduced end to end against a throwaway local
> Postgres and both are now closed. See "Class B remediation" below for the proof tables, the
> two PRs, and the two things the audit had wrong. The analysis in this section is the original
> finding and is preserved as evidence.

This is the class that actually completes an exploit chain, and the analyzer never distinguished
it. The write policy is unrestricted:

```sql
-- 0011_noisydesign_tags_process_featured.sql
create policy photo_tags_insert on photo_tags for insert to authenticated with check (
  (current_setting('request.jwt.claims', true)::json->>'sub') = user_id
);
```

while the visitor read policy authorizes on the **parent** and never checks the child's
`user_id`:

```sql
-- 0012_noisydesign_public_read.sql
create policy photo_tags_visitor_public_read on photo_tags for select to authenticated using (
  (jwt.sub) = 'noisydesign-visitor'
  and exists (select 1 from photos p
              where p.id = photo_tags.photo_id
                and p.status = 'published' and p.visibility = 'public')
);
```

So a row inserted by one tenant against another tenant's published photo **renders publicly on
the victim's page**. Same shape for `featured_items` (reaches the front page), `essay_blocks`,
`issue_items`, `roll_photos`, `photo_assets`.

`yeast-coast-2` is identical via `0014_yeast_coast_public_read.sql`:
`variant_ingredients`, `variant_mash_steps`, `variant_stats`, `variant_media`, `media_assets`
are all exposed through the parent `recipe_variants` published/public state with no child
`user_id` check — injected ingredients or media would appear on a victim's published recipe.

### Class B remediation — both exploits proven, then closed (2026-08-09)

Method: each repo's tenant SQL was applied to a disposable local `postgres:16` container (the same
major version the v2_shared engine runs), with two synthetic owners A and B. No tenant data, no
private data, and no live Flux contact. Both repos were clean and level with `origin/main` before
any work started. Nothing was deployed and no production migration was pushed.

| Project | Vulnerable edge | Exploit before | Policy fix | Exploit after | Analyzer | Tests | Build | PR |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `noisydesign` | 18 FKs across 8 child tables, e.g. `photo_assets.photo_id -> photos` | 10 of 10 cross-parent writes accepted; **7 injected rows rendered publicly on the victim's pages** | `0018` adds a parent-ownership test per FK, keeping the child-owner test; `photo_tags.tag_id` via composite FK | **0 of 10 accepted**, 7 → **0** publicly visible; 6 legitimate owner writes still pass | 54 → **3 FAIL** (all the FK-enforced edge) | 63 static pass | pass | [#5](https://github.com/justinkemersion/noisydesign/pull/5) |
| `yeast-coast-2` | 20 FKs the analyzer found + 2 `hero_media_id` edges it missed | 25 of 25 writes accepted; **4 injected rows rendered publicly** and **B's private media served to anonymous visitors** | `0027` binds each write to the boundary its reads use: `owned` for private structure, `visible` for social; media edges via composite FK | **15 of 15 attacks rejected**, 10 legitimate writes still pass; injection 4 → **0**, private media **no longer served** | 58 → **9 FAIL** (6 FK-enforced, 3 intentional owner-only social deletes) | 233 pass (42 files) | pass | [#11](https://github.com/justinkemersion/yeast-coast-2/pull/11) |

Each repo also gains a static `child-parent-authorization.test.ts` asserting the correct boundary
per edge, that nothing is authorized with `true` or a hardcoded tenant role, and that the visitor
read policies are untouched. `lint`, `typecheck`, `check:drift` and `build` pass in both.

**Two things this audit had wrong.**

1. **`yeast-coast-2` is not the same shape as `noisydesign`.** Uniform parent-ownership would have
   broken the product: commenting on, appreciating, saving and collecting another brewer's
   published recipe is the point. The correct rule is that a child write must require exactly what
   the child's *read* requires — ownership for private structure, public-and-published-or-owned for
   social. A first pass that applied ownership everywhere rejected all five social writes in the
   fixture, which is how this was caught.
2. **The worst edge was never in the finding.** `media_assets_visitor_select` infers publication
   from the *reference*, so an owner could point their own public variant or hero image at somebody
   else's **private** asset and the visitor policy would serve it — a confidentiality breach, not
   just injection. Neither `recipe_variants.hero_media_id` nor `recipe_families.hero_media_id` was
   flagged by the analyzer, because it only considers tables it classifies as children.

**Two constraints discovered that shape any similar fix.**

- **Policy subqueries recurse.** Where a parent's read policy reads the child (`tags` in
  `noisydesign`, `media_assets` in `yeast-coast-2`), proving parent ownership inside the child's
  policy raises `infinite recursion detected in policy`. Composite foreign keys give the same
  guarantee, are not subject to RLS, and cannot recurse. `ON DELETE SET NULL` must be
  column-scoped so a `NOT NULL` owner column is not nulled; that needs PG 15+, and Flux runs 16.
- **RLS applies inside a policy's own subqueries.** A "parent is visible" test cannot pass if the
  caller cannot read the parent. `yeast-coast-2` had no authenticated public select on
  `recipe_families` / `recipe_variants`, so `0027` adds them mirroring `collections_public_select`.
  This also means `recipe_comments_public_select` and `collection_recipes_public_select` from
  `0021` have never matched for a non-owner — they were dead policies, now live.

**Test-safety hazard worth recording.** `noisydesign`'s `pnpm test` runs
`noisydesign.rls.integration.test.ts`, which calls `loadEnvFiles()`; with the repo's local `.env`
present, its guard passes and the suite targets the **live** tenant. Only named static files were
run there. `yeast-coast-2` has no live suite, so its full suite was safe to run.

### Class C — integrity only (`balance`, `casa-panel`) — LOW, open

**Correction to the earlier escalation.** It claimed "the victim's UI reads children by
parent_id." That is false for these two. Every child table carries its own `user_id` and every
SELECT policy filters on it, so an injected row is *invisible to the victim*:

```sql
-- 0008_balance_meals.sql
create policy meal_components_select on meal_components for select to authenticated using (
  (current_setting('request.jwt.claims', true)::json->>'sub') = user_id
);
```

Neither repo has any `security definer` function or public-read policy that could bypass that
filter (verified by grep across all migrations). Real exposure is a contract violation plus a
foreign-key existence oracle over unguessable UUIDs. Worth fixing; **not** release-blocking.
`balance` is 9 links × 3 write policies = 27; `casa-panel` 36.

### Analyzer precision is now a tracked upstream item

Decision: teach the analyzer both rules in Foundry — accept membership/parent delegation as
valid proof, and rank a child as high severity only when it is readable via parent delegation.
Per the no-shims rule this is an upstream fix, not per-repo suppressions.

## Iteration — `casa-panel` divergence resolved

Local `main` had 1 unpushed commit against 3 unpulled remote commits. Rebased onto `origin/main`
and shipped as PR #5 so it got CI and review rather than being discarded. Merged;
`main` = `d1e3190`, clean, synced.

## Iteration — `percept` assessed (deployed, and less exposed than reported)

**It is live.** `flux list` shows `percept` `b915ec8` Active/Running at
`https://api--percept--b915ec8.vsl-base.com`, and the hash matches the local `flux.json`
exactly. Not an abandoned prototype. The API **fails closed**: unauthenticated `GET /moods` and
`GET /` both return `401`.

**Correction:** the earlier escalation said `lib/flux/client.ts` "references `NEXT_PUBLIC_FLUX_*`
(inlined into the browser bundle)." That overstated it. The only reference is a *URL* fallback
(`process.env.FLUX_URL ?? process.env.NEXT_PUBLIC_FLUX_URL`) inside a server module; the base
URL is not a secret, and no key or JWT is client-side. The one client component that touches
`lib/flux` uses `import type { MoodOutputRow }`, which is erased at compile time. **No
browser-side credential exposure.**

What is genuinely wrong, in order:

1. **No `FORCE RLS`** anywhere in `db/migrations/` (16 policies, 3 migrations). If percept's
   runtime role also owns its tables — likely, since it predates the `t_<hex>_ddl` /
   `t_<hex>_role` split — RLS is bypassed for that role and every tenant's `moods` are readable.
   This is the item that decides percept's real severity and needs a DB-level ownership check.
2. **Child-ownership** on `mood_outputs.mood_id -> moods`, same shape as Class C.
3. **No sanitizing `actionError`** — and `FluxHttpError` embeds up to 400 chars of the Flux
   response body in its message, so a thrown error can carry Flux detail to the client.
4. Stale and unguarded: last commit `2026-05-03`, npm rather than pnpm, no `.github/workflows`,
   non-standard `db/migrations/` path, so no CI and no Foundry baseline.

## RESOLVED — `mailpilot-ai` exposure closed and verified

Containment ran with **no exposure window**: `flux project sleep` (verified `502`), then only the
`flux-02d83e6-mailpilot-ai-db` container was started via the `vsl-cloud` docker context so the
migration could be applied with PostgREST still down, then `flux project wake`.

Fix is `flux/migrations/008_phase9_rls.sql` (mailpilot-ai PR #1), mirroring the `001` convention:
`auth.uid() = user_id`, no `to` clause, plus a parent-`accounts` ownership proof on every write,
and `mail_action_log` kept append-only. Post-apply, all 7 tables in `api` carry RLS with policies,
unauthenticated reads return `[]`, and an unauthenticated write is refused:

```
POST /mail_categories -> 42501 new row violates row-level security policy for table "mail_categories"
```

Row counts confirm the canary wrote nothing. Platform cause filed as **Flux issue #8**.

Two follow-ups deliberately left open: `001_mailpilot_init.sql` has a **checksum conflict** with
the remote ledger (edited `2026-06-17` in `68bd8b1` after being applied `2026-06-03`), which
blocks directory-mode `flux push` for this project — so `008` went in as a single-file push and is
not recorded in `flux.flux_migrations`; it is idempotent, so a later recorded re-apply is safe.
CI is now fixed and both PRs are merged (`main` = `9919de8`, green, clean). `mailpilot-ai` CI had
been red since `2026-06-19` for two independent reasons, resolved in PR #2:

- `ci.yml` ran `pip install -e ".[dev]"`, `ruff`, and `pytest` at the repo root while the Python
  package is `mailpilot-runner/`. The install failed outright, so **lint and tests never ran**.
- With that corrected, 15 of 70 tests failed because `process_all_accounts_once` built its
  preference and action-log repositories from `processed_repo._client`. `ProcessedEmailRepository`
  now exposes `preferences()` / `action_log()`, so composition stays behind the repository
  boundary and the in-memory doubles can answer the same calls. The action-log double subclasses
  the real repository and overrides only `insert_row`, so tests still exercise the real audit-row
  construction.
- Three further tests then failed only in CI: they call `get_openai_api_key()`, which loads
  `.env` first, so locally they consumed a developer's real key. The shared autouse fixture now
  pins a placeholder, which also guarantees no test can spend a token.

## Original finding — live unauthenticated write primitive on `mailpilot-ai`

Found by live verification, not by source analysis. **No deployment stage should proceed until
this is closed.**

`mailpilot-ai` is `v1_dedicated`. Three of its seven `api` tables have **RLS disabled and zero
policies**, and full DML is granted to `anon`:

```
relname            | rls | pol | api_grants
mail_action_log    | f   |   0 | anon: SELECT INSERT UPDATE DELETE TRUNCATE (+ authenticated)
mail_categories    | f   |   0 | anon: SELECT INSERT UPDATE DELETE TRUNCATE (+ authenticated)
mail_preferences   | f   |   0 | anon: SELECT INSERT UPDATE DELETE TRUNCATE (+ authenticated)
```

`PGRST_DB_ANON_ROLE=anon`, and **the gateway does not require authentication for this project**:

```
GET  https://api--mailpilot-ai--02d83e6.vsl-base.com/mail_categories?limit=1  -> 200 []
OPTIONS .../mail_categories -> 200
  allow: OPTIONS,GET,HEAD,POST,PUT,PATCH,DELETE
```

So an unauthenticated caller on the public internet has read **and write** access to those three
tables. The tables are currently empty, so nothing is disclosed today, but `INSERT`/`DELETE`/
`TRUNCATE` are live. No write was attempted against production; the grants, the disabled RLS,
the `200`, and the advertised methods are sufficient evidence.

### The gateway's fail-closed guarantee is engine-dependent

This is the platform-level root cause, and it invalidates an assumption Stage 7/8 rests on:

| Project | Engine | Unauthenticated `GET` |
|---|---|---|
| `percept` | `v2_shared` | **401** |
| `mailpilot-ai` | `v1_dedicated` | **200** |
| `yeastcoast` | `v1_dedicated` | **200** |

The 401 canary was only ever run against `v2_shared` projects, so it never covered this.

## `yeastcoast` public reads are an intended feature, correctly built

**Correction.** The unauthenticated `200` responses looked alarming, but reading the live policies
shows a deliberate, correctly-implemented opt-in sharing model — not a defect:

```
relname  | polname              | cmd | using / with_check
recipes  | public_read          | r   | (is_private = false)
recipes  | owner_read           | r   | (auth.uid() = user_id)
recipes  | owner_insert         | a   | (auth.uid() = user_id)
profiles | profiles_public_read | r   | true
```

`recipes.is_private` has **`column_default = true`, `NOT NULL`**, so recipes are private on
creation and only become world-readable when the owner opts in. The "YeastCoast Heritage Lager"
row returned earlier was published on purpose.

**There is no write exposure.** All 23 insert/update policies across the schema are gated on
`auth.uid() = <owner column>`, so an unauthenticated caller cannot write anything.

Two things remain worth a decision, neither urgent:

1. `profiles_public_read` is `using (true)` — unconditional, with no per-row opt-out unlike
   `recipes`. It exposes `username`, unit preferences, `default_efficiency`, and `public_code` for
   every user. Nothing sensitive (no email), and it is named as a public surface, so this is a
   product choice rather than a bug.
2. `relforcerowsecurity = 0` on all 17 tables, all owned by `postgres`. RLS is on everywhere with
   correct policies, so the request path is safe, but an owner-role connection would bypass it.
   This is the same defense-in-depth gap as `mailpilot-ai` and is covered by Flux issue #8.

## Original observation — `yeastcoast` serves tenant rows unauthenticated

Also `v1_dedicated`, also `200` unauthenticated. Real rows come back, including `user_id`:

```
GET /recipes?limit=2  -> [{"id":"08616334-…","user_id":"0f724598-…","name":"YeastCoast Heritage Lager",…
GET /profiles?limit=2 -> [{"id":"a0000000-…","username":"community_beginner",…,"public_code":"y…
```

All 17 tables have RLS enabled with policies, so this may be an intentional community/public
read surface — **needs an owner decision, not a unilateral fix.** What is *not* intentional:
`relforcerowsecurity = 0` on all 17 tables, all owned by `postgres`. Any connection as the owner
bypasses RLS entirely.

## `FORCE RLS` in app migrations is a false alarm — the platform applies it

A single catalog query over the shared cluster settles a class of findings the analyzer reports
from source:

```sql
select n.nspname, count(*) tables, count(*) filter (where c.relrowsecurity) rls_on,
       count(*) filter (where c.relforcerowsecurity) force_on,
       count(*) filter (where pg_get_userbyid(c.relowner) like '%\_ddl') ddl_owned
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname like 't\_%\_api' and c.relkind = 'r' group by 1;
```

Every `v2_shared` tenant comes back fully `force_on` and `ddl_owned` **even when its own
migrations never declare `force row level security`** — `percept` (2/2) and `habitat` (16/16)
both confirm it. Flux provisioning owns this invariant, so flagging its absence in app SQL is
noise. Two exceptions, below.

## `logos-engine`: RLS is *disabled*, not merely mis-scoped

Sharpens the deferred blocker with production evidence. Schema `t_744b22df8382_api`, 14 of 17
tables have RLS on; these three do not:

```
t_744b22df8382_api.ai_runs              rls=f force=f policies=4
t_744b22df8382_api.translation_layers   rls=f force=f policies=5
t_744b22df8382_api.translation_variants rls=f force=f policies=5
```

Each has 4–5 policies defined that are **inert** because RLS is switched off. No runtime role
holds table grants either, which is consistent with the app being broken in production rather
than leaking. Still deferred per the standing decision; now documented with specifics.

## Orphaned tenant schema in the shared cluster

`t_b86da057199a_api` maps to **no project** in `flux list` (all 17 are accounted for elsewhere).
It holds `profiles` and `products`, both owned by `postgres` with `force_rls = f`, and grants no
privileges to any runtime role — so no PostgREST instance can reach it. Unmanaged residue
created outside normal provisioning, not an exposure. A Flux-core hygiene item.

## Live projects absent from the audit set

`flux list` returns 17 running projects; the invariant table above covers 14 of them. Never
audited: **`bloom-atelier`**, **`mailpilot-ai`**, **`yeastcoast`** (the last is probably the
superseded predecessor of `yeast-coast-2`, but it is still Active/Running). `the-shelf` and
`yeastcoast` have no local checkout, so they cannot be audited from this workstation as-is.
Completion criteria cannot claim a clean fleet while three live projects have never been
evaluated.

## Release-blocker position after Class B (2026-08-09)

**Both high-severity public-read child-injection flaws are closed in source: MERGED — MIGRATION
PENDING.** Each PR carried the migration plus a static regression test, with the exploit reproduced
and then proven rejected on a disposable local Postgres. Head SHAs and CI were re-verified against
the exact commit immediately before merging.

| Project | PR | Merged commit on `main` | Migration awaiting Stage 10 push | Live schema |
| --- | --- | --- | --- | --- |
| `noisydesign` | [#5](https://github.com/justinkemersion/noisydesign/pull/5) | `6b11d9ca4a40418c4cea52a1aedb18c9b7ea2c3d` | `sql/migrations/0018_harden_child_parent_authorization.sql` | `t_…` v2_shared — **still vulnerable** |
| `yeast-coast-2` | [#11](https://github.com/justinkemersion/yeast-coast-2/pull/11) | `67f137541e4170a689478988f6a4c98efb184051` | `sql/migrations/0027_harden_child_parent_authorization.sql` | `t_afe050baa154_api` v2_shared — **still vulnerable** |

Merged 2026-08-09 (squash, branches deleted); both local trees clean and level with `origin/main`.
Nothing was deployed and neither migration has been pushed, so **the running applications remain
exploitable until Stage 10 applies these two files.** That is now the only thing standing between
these two apps and a closed finding.

Stage 10 note: `yeast-coast-2`'s `0027` uses `on delete set null (hero_media_id)`, which requires
Postgres 15+. The v2_shared engine runs `postgres:16`, and the fix was verified on that major
version locally. Its composite foreign keys will fail loudly if production holds pre-existing
cross-owner rows; that is intended, and such rows must be inspected and remediated rather than the
constraint weakened.

Remaining child-ownership blockers, by class:

| Class | Repos | Count | Blocks relaunch? |
| --- | --- | --- | --- |
| A — cross-tenant read breach | — | 0 | resolved (`roommating`) |
| B — public content injection | — | 0 | resolved (this pass) |
| C — integrity only | `balance`, `casa-panel` | 63 policy FAILs | No. Injected rows are invisible to the victim; every SELECT filters on the child's own `user_id`. |
| Deferred (dirty or by decision) | `habitat`, `theshelf`, `flux-control-room`, `logos-engine` | 218 policy FAILs | Documented blockers, not remediable without touching dirty trees. |

So the only unresolved *inherited* security work is Class C, which is low severity by evidence
rather than by assumption. The release-blocking question now rests on deployment sequencing
(Stages 7–10), not on undiscovered authorization defects in the audited set.

**Next unevaluated live project: `bloom-atelier`** (v2_shared, 3 tables). It was held back
deliberately while the two high-severity items were closed, and is now in progress. Two
live projects behind it still have no local checkout (`the-shelf`, `yeastcoast`), so the fleet gate
cannot claim complete coverage until that is resolved.

Also carried forward from this pass, both feeding `analyzer_precision`:

- The analyzer cannot see composite foreign keys, so a correctly-closed edge still reads as FAIL.
- The analyzer only evaluates tables it classifies as children, so it missed
  `recipe_variants.hero_media_id` and `recipe_families.hero_media_id` — the edges that allowed
  another owner's **private** media to be served publicly, the most severe finding of this pass.

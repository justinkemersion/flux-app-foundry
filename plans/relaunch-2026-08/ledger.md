# Flux + Foundry relaunch — completion ledger

Rewritten on every loop iteration. **Historical entries are evidence, not authorization.**
Every value below was produced by a read-only check at the time shown; re-run the check
before acting on it.

Last updated: 2026-08-09 — control-plane deploy `dc3e325`; migration infrastructure READY.

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

**Next unevaluated live project: `bloom-atelier`** — now audited, see the `bloom-atelier` section at
the end of this ledger. It is `v1_dedicated`, not `v2_shared` as assumed here, and not a Foundry
fork; its authorization held up under probing and nothing about it blocks relaunch. Two
live projects behind it still have no local checkout (`the-shelf`, `yeastcoast`), so the fleet gate
cannot claim complete coverage until that is resolved.

Also carried forward from this pass, both feeding `analyzer_precision`:

- The analyzer cannot see composite foreign keys, so a correctly-closed edge still reads as FAIL.
- The analyzer only evaluates tables it classifies as children, so it missed
  `recipe_variants.hero_media_id` and `recipe_families.hero_media_id` — the edges that allowed
  another owner's **private** media to be served publicly, the most severe finding of this pass.

## `bloom-atelier` audit — the last unevaluated live project (2026-08-09)

Read-only audit; the working tree was left untouched (6 untracked files, no tracked modifications,
level with `origin/main` at `9f91419`). No migration, no deploy, no commit in that repo.

**It is not a Foundry fork.** No `_contract/`, no `foundry.baseline.json`, no `FOUNDRY_BASELINE.md`,
npm rather than pnpm, migrations under `flux/migrations/`, and no `flux.json` (CLI calls need
`--hash 61d9dff`). Same category as `percept` and `mailpilot-ai`: a standalone Flux app. Foundry
invariants therefore do not apply as written, and it cannot be brought under the baseline without a
separate decision.

**It is `v1_dedicated`, not `v2_shared` as this ledger previously assumed.** So per Flux
[#8](https://github.com/justinkemersion/Flux/issues/8) there is **no gateway authentication** —
`GET /` returns 200 with the PostgREST OpenAPI document and RLS is the only access control.

### Test-suite safety, established before running anything

`npm test` is `tsx --test 'src/lib/**/*.test.ts'` over two files. Both are pure unit tests: they
import only `src/lib/demo/{constants,is-demo-enabled,session}` and `src/lib/atelier-assets`, none of
which reads a Flux variable, opens a socket, or loads dotenv; the only env touched is
`AUTH_DEMO_ENABLED`. `tsx --test` does not auto-load `.env` the way Next.js does. Run with
`FLUX_URL`, `FLUX_GATEWAY_JWT_SECRET` and `FLUX_SERVICE_TOKEN` explicitly unset: **13 pass**.

### Authorization is actually sound — verified, not assumed

Probed through an SSH tunnel with every statement in its own transaction and every transaction
rolled back; a final count confirmed zero probe rows committed. Tunnel closed and the retrieved
password file deleted afterwards.

| Probe | Result |
| --- | --- |
| anon read `products` | 16 rows — public catalog, intentional |
| anon read `profiles` / `atelier_images` | **0 / 0** |
| anon `INSERT` product | **rejected by RLS** |
| anon `UPDATE` / `DELETE` all products | **0 rows / 0 rows** |
| anon `INSERT` profile | **rejected by RLS** |
| foreign sub `INSERT` product owned by another maker | **rejected by RLS** |
| foreign sub `INSERT` image against another maker | **rejected by RLS** |
| foreign sub `INSERT` profile for another `auth_id` | **rejected by RLS** |
| foreign sub `UPDATE` / `DELETE` another maker's product | **0 rows / 0 rows** |
| foreign sub `INSERT` own product | allowed, by design |
| shopper visitor sub (`bloom-shopper-anon`) | products 16, images 46, profiles 0 — guest catalog as designed |

**No `mailpilot-ai`-class hole.** All three tables have RLS enabled with policies, there is no
unauthenticated write primitive, and no cross-owner write of any kind. `atelier_images` even carries
a composite foreign key (`atelier_images_profile_match_fkey`) binding an image to the owning
profile — independently the same mechanism used in `noisydesign` `0018` and `yeast-coast-2` `0027`.

### Findings

1. **No `FORCE RLS`, tables owned by `postgres`, and PostgREST connects as `postgres`.** All three
   tables are `rls=true force=false owner=postgres`, and `pg_stat_activity` shows the only
   PostgREST connection authenticating as `postgres` — superuser, `bypassrls=true`, and the table
   owner. Isolation therefore rests entirely on PostgREST issuing `SET ROLE anon`/`authenticated`
   per request. It does today, which is why the probes above behave correctly, but a single request
   path that skips `SET ROLE`, or a JWT carrying a `role` claim naming a bypassing role
   (`postgres`, `service_role` — both `bypassrls=true`), collapses every isolation guarantee at
   once. Flux's `FORCE RLS` invariant has not been applied: 3 tables qualify and none is forced.
   This is the same platform gap as Flux #8 — `v1_dedicated` projects get neither gateway auth nor
   the RLS invariant.
2. **The Flux JWT is exposed to the browser.** `src/auth.ts` sets `session.fluxJwt = token.fluxJwt`,
   and `src/app/api/auth/[...nextauth]/route.ts` serves `/api/auth/session`, so a signed-in user's
   browser can read a working Flux bearer token. Nothing client-side uses it — there is no
   `SessionProvider` and no client component references `fluxJwt` or `useSession` — so this is
   gratuitous exposure. With no gateway auth in front of PostgREST, that token permits direct
   database writes outside all server-side validation. Minting itself is server-only and hardcodes
   `role: "authenticated"` (`src/lib/flux-jwt.ts`), so the role is not caller-controllable.
3. **Raw PostgREST error bodies are rendered to users.** `src/lib/flux-fetch.ts` returns
   `text.slice(0, 280)` or PostgREST's `message` verbatim, and five pages render `loaded.error`
   straight into the markup (`market`, `studio`, `studio/settings`, `atelier/[slug]`,
   `atelier/[slug]/product/[productId]`). Confirmed leaky in practice: an unauthenticated probe
   returned `relation "t_485382535699_api.orders" does not exist`, disclosing the internal tenant
   schema name. Same class as the inherited `action-errors-no-leak` defect, in a repo that has none
   of Foundry's protections.
4. **Policies target `PUBLIC`, not `TO authenticated`, and `anon` holds write grants.** All five
   policies have `polroles = 0` (PUBLIC), and `anon` has `INSERT, UPDATE, DELETE` on all three
   tables. Only the policy predicates stop anonymous writes, so there is no defence in depth. The
   canonical form scopes policies `TO authenticated` and withholds write grants from `anon`.
5. Hygiene: 6 untracked files in the working tree, including two that look like accidents from a
   mistyped command (`bloom-atelier@0.1.0`, `tsx`).

### Verdict

**Not release-blocking, and no emergency action taken or needed** — unlike `mailpilot-ai`, there is
no live unauthenticated write primitive and no cross-tenant read or write. Findings 1–4 are real and
should be fixed, but they are hardening and defect work rather than an open exposure: 1 is a platform
gap already tracked as Flux #8, 2 and 3 are app defects, 4 is defence in depth.

**The fleet audit set is now complete for every live project with a local checkout.** `the-shelf`
and `yeastcoast` still have none, so the fleet gate cannot claim total coverage until that is
resolved.

## Stage 10 — application relaunch: `noisydesign`, `yeast-coast-2` (2026-08-09)

Scope is exactly these two apps. No other project is migrated or deployed in this stage.

### Toolchain correction found before any write

The globally installed `flux` binary (`~/.local/share/pnpm/bin/flux`) is a shim onto
`packages/cli/dist/index.cjs`, built `2026-08-08 08:26`. The pooled-push correctness fix
(`460a4aa`, "make pooled push SQL adaptation lexically aware", PR #7) landed `2026-08-08 17:13`.
**The installed binary therefore predates the fix and still rewrites `authenticated` by plain regex
over the whole file** — including comments, string literals and PL/pgSQL bodies. Both migrations in
this stage carry `authenticated` in header comments, and `noisydesign`'s applied `0014` contains the
exact `execute format('grant authenticated to %I', tenant_role)` case that the buggy adapter turned
into a tenant-role self-grant.

Every push and probe in this stage is therefore driven through source, not the shim:

```
/home/justin/Projects/flux/node_modules/.bin/tsx \
  /home/justin/Projects/flux/packages/cli/src/index.ts <cmd>
```

`@flux/core` resolves to `src/` (`main: src/index.ts`, all `exports` point at `./src/*.ts`), so a
source run picks up the corrected adapter with no build step. Verified before use:
`packages/core/src/pooled-push-sql-adapt.test.ts` — **23/23 pass**, including "leaves dynamic SQL
string contents unchanged" and "leaves dollar-quoted bodies unchanged".

Follow-ups recorded, neither release-blocking:
- The stale global shim should be rebuilt or removed so the corrected path is the default.
- `printSingleFilePushPreview` (`packages/cli/src/lib/migrations-output.ts:152`) prints
  "Single-file push (raw SQL, not recorded in flux.flux_migrations)" **unconditionally**, ignoring
  `--mode`. With `--mode versioned` the apply path really does go through `pushMigrationFile` and
  record a checksummed ledger row (`commands/push.ts:242`). The preview message is wrong, not the
  behaviour.

### `noisydesign` pre-gate — recorded before push

| Field | Value |
| --- | --- |
| pre-push app SHA | `6b11d9ca4a40418c4cea52a1aedb18c9b7ea2c3d` (local `main` == `origin/main`) |
| working tree | clean (0 entries) |
| project / tenant | `noisydesign`, hash `5ff9c19`, `v2_shared`, Active/Running |
| API schema | `t_f361c4681136_api` |
| engine | PostgreSQL 16.13 |
| table ownership | all 17 tables owned by `t_f361c4681136_ddl` (DDL-owner separation intact) |
| RLS | `rls_enabled = t` and `force_rls = t` on all 17 tables |
| remote ledger | **0 applied** — `flux.flux_migrations` is empty |
| applied in reality | `0001`–`0016` (verified by policy inventory, 131 live policies) |
| target migrations | `0017_harden_child_record_ownership.sql`, `0018_harden_child_parent_authorization.sql` |
| timestamp | 2026-08-09T09:30:26Z |

### Two pre-gate deviations, both resolved by evidence before proceeding

**1. The remote ledger is empty, so a directory push would replay all 25 migrations.**
`flux push sql/migrations --plan` reports `Plan. 25 would apply, 0 in ledger`, and the CLI itself
warns "Migration ledger is empty for this project; existing tables may be from raw/repeatable push
or pre-ledger applies." Replaying is forbidden by this stage's safety rules and is genuinely unsafe
here (`0014` re-runs tenant-role grant logic). Resolved by direct introspection rather than by
trusting the ledger: `0001`–`0016` are applied, and `0018` is definitively **not** applied because
neither constraint it adds (`tags_id_user_id_key`, `photo_tags_tag_id_user_id_fkey`) exists.

Decision: apply each pending file with a **single-file versioned push** (`--mode versioned`), which
applies exactly that file and records one checksummed ledger row, leaving `0001`–`0016` untouched.
The residual gap — `0001`–`0016` remain unrecorded, so a future directory push still sees them as
pending — is pre-existing and is **not** papered over here. Flux has no supported
baseline/mark-applied command; inventing one by hand-writing ledger rows was rejected. Tracked as a
Flux-core follow-up.

**2. `0017` is also unapplied — production was missing two security migrations, not one.**
`notes_insert`, `notes_update`, `record_tags_insert` and `record_tags_update` in the live schema
check only `(request.jwt.claims->>'sub') = user_id`, with no parent `exists (...)` clause. The
inherited Foundry `notes` / `record_tags` child-ownership defect was therefore **still open in
`noisydesign` production**, alongside the Class B injection that `0018` closes. All 18 write
policies across the eight `0018` target tables likewise showed `has_parent_check = false`,
independently re-confirming the live Class B exposure at pre-gate time.

`yeast-coast-2` shows the same pattern: its ledger is healthy (24 recorded) with exactly two pending
files, `0026_harden_child_record_ownership.sql` and `0027_harden_child_parent_authorization.sql`.

Both extra migrations are already-merged security work and are required to reach merged `main`, so
both are in scope for this stage.

### NOISYDESIGN — RELAUNCHED (2026-08-09)

Both migrations applied, both live vulnerabilities closed, app deployed to merged `main`, smoke clean.

| Field | Value |
| --- | --- |
| deployed app SHA | `6b11d9ca4a40418c4cea52a1aedb18c9b7ea2c3d` (host checkout clean, `main`) |
| previous deployed SHA | `8b78bd21bab017d06d6f5390dbabbfd49fe32aa0` (2026-06-15) |
| migrations applied | `0017_harden_child_record_ownership.sql`, `0018_harden_child_parent_authorization.sql` |
| tenant / schema | `noisydesign` `5ff9c19` / `t_f361c4681136_api` |
| ledger after push | 2 applied, each exactly once, distinct checksums (`62de637ba03d…`, `9eeaca544cfb…`) |
| synthetic attack result | 14/14 cross-parent write classes **rejected** |
| legitimate-write result | 8/8 owner writes **accepted** |
| public smoke result | visitor reads published content, 0 foreign child rows on victim pages |
| cleanup | 0 residual rows — verified by re-querying all 12 tables for both synthetic subs |
| deploy method | `deploy/relaunch.sh` — git `pull --ff-only` on host + `docker compose up --build -d` (no rsync/scp) |

#### Migration mechanism actually used

`flux push sql/migrations/<file>.sql --mode versioned`, once per file, driven through
`packages/cli/src/index.ts` under `tsx` so the corrected pooled-push adapter was in effect. The
directory push was deliberately **not** used, because the empty ledger would have replayed all 25
files.

#### Database state verified after push

- Both constraints exist with the intended definitions:
  `tags_id_user_id_key UNIQUE (id, user_id)` and
  `photo_tags_tag_id_user_id_fkey FOREIGN KEY (tag_id, user_id) REFERENCES tags(id, user_id) ON DELETE CASCADE`.
- All **24** write policies across the eight target tables now satisfy
  `all_have_parent_check = true`; `notes` / `record_tags` carry the `0017` parent `EXISTS` clause
  with `record_id IS NULL` still permitted for standalone notes.
- **Zero** policies with `WITH CHECK(true)` or `USING(true)` anywhere in the schema.
- RLS `enabled` and `forced` on 17/17 tables, all owned by `t_f361c4681136_ddl`.
- All 12 `*_visitor_public_read` SELECT policies intact — the published surface was not narrowed.

#### On the `t_<hash>_role` policy scoping — not a workaround

The 32 policies written by `0017`/`0018` show `roles = {t_f361c4681136_role}` rather than
`{authenticated}`. This is the **documented v2_shared pooled-push adaptation**, not a hardcoded
tenant-role bridge: the shared cluster has `anon` / `authenticator` but no global `authenticated`
role, so `adaptPooledPushSql` rewrites the role in `CREATE POLICY` to the tenant role
(`pooled-push-sql-adapt.ts:195-216`). The canonical source SQL in git is unchanged and still says
`to authenticated`.

It is also not a weakening. `authenticator` is the login role and is a member of every tenant role;
`t_f361c4681136_role` is in turn a member of `authenticated` (established by the already-applied
`0014`). So the runtime identity is `t_f361c4681136_role`, both policy forms apply to it, and
scoping directly to the tenant role is *narrower* than scoping to `authenticated`. Confirmed
empirically: the 8 legitimate owner writes were accepted through the live gateway, which is only
possible if the new policies apply at runtime.

#### Production security smoke — 27/27, synthetic fixtures only

Run through the real path (gateway → PostgREST → RLS) with HS256 JWTs for two synthetic subs
(`nd-s10-attacker-<run>`, `nd-s10-victim-<run>`), because platform read/write DB credentials are
disabled (`FLUX_DB_ACCESS_ALLOW_READWRITE` unset) — a stronger test than a psql simulation.

Rejected (13 by RLS `42501`, 1 by composite FK `23503`):

| Attack | Result |
| --- | --- |
| `photo_assets` `kind='display'` → victim public photo (the rendered image) | 403 `42501` |
| `process_notes` → victim public photo | 403 `42501` |
| `photo_tags` → victim public photo + attacker tag | 403 `42501` |
| `photo_tags` → attacker photo + **victim tag** | 409 `23503` (composite FK) |
| `roll_photos` → victim roll + victim photo | 403 `42501` |
| `roll_photos` → attacker roll + victim photo | 403 `42501` |
| `roll_photos` → victim roll + attacker photo | 403 `42501` |
| `essay_blocks` text → victim public essay | 403 `42501` |
| `essay_blocks` photo → attacker essay + victim photo | 403 `42501` |
| `issue_items` → victim issue + attacker photo | 403 `42501` |
| `issue_items` → attacker issue + victim photo | 403 `42501` |
| `featured_items` → attacker row referencing victim photo | 403 `42501` |
| `issues` insert with `cover_photo_id` = victim photo | 403 `42501` |
| `issues` update setting `cover_photo_id` = victim photo | 403 `42501` |

Accepted, proving the fix is not over-tight: own-photo display asset, own process notes, own
photo+own tag, own roll+own photo, own essay block, own issue item, own featured item, and setting
`cover_photo_id` to the caller's own photo.

Visitor path: the victim's published public photo is still readable, and `photo_assets`,
`process_notes` and `photo_tags` for it contain **zero** rows owned by anyone else.

#### App smoke

| Check | Pre-deploy | Post-deploy |
| --- | --- | --- |
| `/` | 200 | 200 (56 KB, `<title>NoisyDesign</title>`) |
| `/archive` (public gallery) | 200 | 200 (42 KB) |
| `/login`, `/signup` | 200 | 200 |
| `/studio/photos`, `/dashboard`, `/records` | 307 | 307 (fail-closed) |
| container health | healthy | healthy, `RestartCount = 0` |

Health probe is the container's own `fetch('http://127.0.0.1:3000/')` check — passing. No 5xx on any
route. Create/update behaviour is covered by the 8 accepted owner writes above, which exercise the
same PostgREST path the server actions use. No raw Flux/PostgREST detail (`t_f361c4681136`,
`PGRST*`, `permission denied for`) appears in any public HTML response — and this deploy is the
first time the `actionError` sanitiser (#4) has actually run in production here.

Targeted live suite `sql/migrations/noisydesign.rls.integration.test.ts` (the app's own audited
synthetic-owner harness, run as a single file — never the aggregate `pnpm test`): **10/11 pass.**

#### Two pre-existing defects found, neither a regression and neither release-blocking

1. **`resolve_unlisted_photo` is broken by platform-applied `FORCE RLS`.** This is integration case
   8, the only failure, and it predates this stage. The function is `SECURITY DEFINER` and reads only
   `photos` — a table **neither** `0017` nor `0018` touches — so it cannot be a regression from this
   push. `force_rls` subjects even the table owner to RLS, so the definer sees no rows and share-link
   resolution returns `[]`. Unlisted share links are therefore non-functional in production. It
   **fails closed**, so it is a functionality gap, not an exposure.
2. **Unauthenticated dashboard requests log a `TypeError`.** `app/(dashboard)/layout.tsx:16` reads
   `session.user.id` and the dashboard pages use `session!.user!.id`; when middleware redirects an
   unauthenticated caller the render still evaluates those assertions. Proven by controlled
   experiment: one unauthenticated `GET /activity` moved the count 3 → 4 and returned 307, while
   `GET /archive` (public) added none. All the affected files are untouched by the four deployed
   commits. The redirect is correct and no data is served, so this is log noise plus a latent
   robustness defect.

### `yeast-coast-2` pre-gate — recorded before push

| Field | Value |
| --- | --- |
| pre-push app SHA | `67f137541e4170a689478988f6a4c98efb184051` (local `main` == `origin/main`) |
| working tree | clean (0 entries) |
| project / tenant | `yeast-coast-2`, hash `9348482`, `v2_shared`, Active/Running |
| API schema | `t_afe050baa154_api` |
| engine | PostgreSQL 16.13 — satisfies the `>= 15` requirement for column-scoped `ON DELETE SET NULL` |
| remote ledger | healthy: 24 applied, 2 pending |
| target migrations | `0026_harden_child_record_ownership.sql`, `0027_harden_child_parent_authorization.sql` |
| RLS | enabled and forced on 25/25 tables, all owned by `t_afe050baa154_ddl` |

Unlike `noisydesign`, the ledger here is intact, so the normal **directory push** was the correct
mechanism and applied exactly the two pending files with checksum verification
(`Done. 2 applied, 24 skipped`).

### The composite-FK integrity precheck could not be run as specified — reported, not faked

The pre-push read-only integrity queries **returned zero violations, and that result was worthless.**
The temp credential `flux_temp_ro_9348482_01a6dbd2` has `rolbypassrls = false`, `rolsuper = false`,
and is a member of `flux_tenant_9348482_ro` only — while every policy in the schema targets
`authenticated` or the tenant role. No policy applies to it, so **it sees 0 rows in every table**.
`pg_stats` is filtered by the same rule and `pg_statistic` is `permission denied`. Read/write access
is disabled platform-wide (`FLUX_DB_ACCESS_ALLOW_READWRITE` unset), so there was no credential
available that could see the rows.

The statistics collector (`pg_stat_all_tables`, not RLS-filtered) proved the tables were **not**
empty, which is what made the vacuous result detectable:

| table | live rows | relevance |
| --- | --- | --- |
| `variant_ingredients` | 83 | owned edge |
| `brew_log_entries` | 23 | owned edge |
| `media_assets` | 14 | composite FK target |
| `brew_log_media` | 7 | new composite FK |
| `recipe_variants` | 7 | new `hero_media_id` composite FK |
| `recipe_families` | 5 | new `hero_media_id` composite FK |
| `variant_media` | 4 | new composite FK |
| social tables | 0 | — |

`reltuples` / `relpages` were useless here as a cross-check: four of those tables report
`reltuples = -1` with `relpages = 0` because they have never been analyzed.

Decision: proceed on the transactional guarantee. Pooled push runs user SQL inside a transaction
(`SET LOCAL ROLE` / `SET LOCAL search_path` only take effect in one, and unqualified names
demonstrably resolve in the tenant schema), so a composite FK that found cross-owner rows would abort
`0027` atomically — no partial state, no data modified, nothing weakened — and name the constraint.

**Both migrations applied cleanly, which retroactively supplies the missing proof.**
`ALTER TABLE ... ADD CONSTRAINT` validates every existing row, so its success against 4 + 7 + 7 + 5
real rows is direct evidence from the database that **zero cross-owner references existed** — a
stronger guarantee than the query that was blocked. No production data was inspected to get it.

Tracked as a platform follow-up: there is no supported way to run a read-only integrity audit against
a v2_shared tenant, because the audit credential is subject to the tenant's own RLS.

### NOISYDESIGN / YEAST-COAST-2 status

| | `noisydesign` | `yeast-coast-2` |
| --- | --- | --- |
| status | **RELAUNCHED** | **RELAUNCHED** |
| deployed app SHA | `6b11d9ca4a40418c4cea52a1aedb18c9b7ea2c3d` | `67f137541e4170a689478988f6a4c98efb184051` |
| previous deployed SHA | `8b78bd2` (2026-06-15) | `e4ac8ea` |
| migrations applied | `0017`, `0018` | `0026`, `0027` |
| tenant / schema | `5ff9c19` / `t_f361c4681136_api` | `9348482` / `t_afe050baa154_api` |
| ledger | 2 applied, each once | 26 applied, each once |
| synthetic attack result | 14/14 rejected | 18/18 rejected |
| legitimate-write result | 8/8 accepted | 10/10 accepted |
| public smoke | all routes at baseline, no 5xx | 12 public 200, 5 auth 307, no 5xx |
| cleanup | 0 residual rows | 0 residual rows |
| static regression suites | 63/63 | 70/70 |

### `yeast-coast-2` database state verified after push

- All five constraints exist with exactly the intended definitions, including
  `ON DELETE SET NULL (hero_media_id)` on both hero references — confirmed through
  `pg_constraint.confdelsetcols`, which resolves to `hero_media_id` alone, so the `NOT NULL`
  `owner_user_id` is untouched.
- The four superseded single-column media FKs are gone; no orphan constraints.
- **33/33** write policies on the eleven `owned` tables prove parent ownership.
- The `visible` tables carry the read-boundary test on INSERT/UPDATE, with deletes deliberately
  owner-scoped: `recipe_appreciations` / `recipe_saves` on `user_id`, and `recipe_comments` allowing
  the comment author **or** the recipe owner (moderation).
- Both new authenticated public SELECT policies exist with predicate
  `visibility = 'public' AND status = 'published'` — exactly what the visitor policies already serve.
- **Zero** `WITH CHECK(true)` / `USING(true)` policies; no bridge grant or tenant-role self-grant in
  any function body.

### `yeast-coast-2` production security smoke — 35/35, synthetic fixtures only

**Owned structure — 10/10 injections rejected** (`403 42501`): `variant_ingredients`,
`variant_mash_steps`, `variant_stats`, `variant_fermentation_stages`, `variant_media`,
`recipe_variants` into another brewer's family, `brew_logs`, `brew_log_entries`,
`brew_log_snapshots`, `collection_recipes`.

**Private media disclosure — 4/4 rejected** (`409 23503`, the composite FKs doing the work):
linking B's private media into A's public variant, setting `recipe_variants.hero_media_id` and
`recipe_families.hero_media_id` to B's private asset, and attaching it to A's brew log.

**Social boundary — the distinction that mattered.** The same four actions were accepted against a
published public parent and rejected against a private one:

| action | public parent | private parent |
| --- | --- | --- |
| comment on another brewer's recipe | 201 | 403 `42501` |
| comment on another brewer's variant | 201 | — |
| appreciate | 201 | 403 `42501` |
| save | 201 | 403 `42501` |
| collect into own collection | 201 | 403 `42501` |

This confirms child write authorization tracks the parent's **read** boundary rather than universal
parent ownership, so the cross-brewer social product still works.

**Public confidentiality.** Private media owned by A could not be referenced through public content
owned by B (both the `variant_media` link and the `hero_media_id` route rejected `409 23503`), and an
anonymous visitor request for that asset returned zero rows.

**Legitimate owned writes — 5/5 accepted**, plus public browsing: visitor reads the published family,
cannot read the private one, and an authenticated non-owner can now read a published recipe through
the `0027` public SELECT policy — the gap that previously made `recipe_comments_public_select` and
`collection_recipes_public_select` unmatchable for non-owners.

### `yeast-coast-2` app smoke

12 public routes returned 200 (`/`, `/recipes`, `/brewers`, `/collections`, `/community`, `/search`,
`/styles`, `/ingredients`, `/learn`, `/tools`, `/about`, `/login`); 5 authenticated routes returned
307. A real published recipe page (`/recipes/prost-coast-pale-ale`) renders at 43 KB with media
references intact, so hero/media rendering survives the composite FKs. Container healthy,
`RestartCount = 0`. No `t_afe050baa154`, `PGRST*`, `permission denied`, `42501` or `23503` text in
any public HTML.

The only log entries are 6 `UnauthorizedError: Unauthorized` — the app's intentional fail-closed auth
helper. Correlated by controlled experiment: one unauthenticated `GET /app/notifications` moved the
count 5 → 6 and returned 307, while `GET /styles` added none. No 5xx was served.

## Both previously confirmed live vulnerabilities are now CLOSED IN PRODUCTION

1. **Class B public content injection** (`noisydesign`, `yeast-coast-2`) — closed. 32 distinct
   cross-parent write classes were attempted against the live schemas across both apps and **all 32
   were rejected**, while 18 legitimate owner writes and 5 legitimate cross-owner social
   interactions succeeded.
2. **Inherited Foundry `notes` / `record_tags` child-ownership defect** — closed in both apps by
   `0017` / `0026`. This had **not** been applied to `noisydesign` production before this stage;
   pre-gate introspection found its write policies still authorizing on `child.user_id` alone.

Stopping here as instructed. No other application was migrated or deployed.

---

# Stage 10 follow-up — Flux CLI build-artifact boundary hardened

Flux PR [#9](https://github.com/justinkemersion/Flux/pull/9), branch `harden/cli-build-provenance`,
commit `3fc6cce`. No Flux deploy and no application migration were performed in this task.

## Root cause

The `flux` on PATH is a pnpm global-link shim that `exec node`s
`/home/justin/Projects/flux/packages/cli/dist/index.cjs` directly — the installed binary **is** the
repo's build output, so a missed rebuild silently runs the previous commit's logic. Nothing in the
CLI surface could reveal that: `CLI_VERSION` was a string literal pinned in
`cli-handlers/cli-version.ts`, so the 08:26 bundle and the 17:13 source both answered `2.0.1`.

Confirmed rather than assumed: the bundle shipped on 2026-08-08 contained **zero** occurrences of
`scanSqlCodeSpans`, `splitStatements` or `ADP_IN_SCHEMA_PUBLIC` — the identifiers introduced by
`460a4aa` — while reporting the same version as the fixed source.

## Correction to the Stage 10 assumption

The pooled-push adapter is **not** in the CLI. `adaptPooledPushSql` is imported only by
`apps/dashboard/src/lib/pooled-push.ts` and `pooled-migrations.ts`, and is provably absent from
`packages/cli/dist/index.cjs` (0 hits for `adaptPooledPushSql`, `normalizePushSql`,
`pooled-push-sql-adapt`). The CLI transports SQL unmodified via `client.pushSql`; the **deployed
control plane** performs tenant-role adaptation.

So the Stage 10 `tsx` workaround did not change which adapter ran — the deployed dashboard adapted
the SQL either way. Whether Stage 10's pushes were adapted by fixed code is a property of the
deployed control plane, not of the local CLI. The migrations verified clean in production afterward,
which is the evidence that matters.

`@flux/core` has no build step (`main: src/index.ts`), so the adapter's compiled home is the
dashboard's Next build. **Control-plane artifact provenance remains unguarded** — recorded below as
a follow-up.

## Provenance model

Embedded at build time by `packages/cli/tsup.config.ts` through esbuild `define` into
`__FLUX_BUILD_PROVENANCE__`: `version` (package.json), `sourceSha` (`git rev-parse HEAD`),
`sourceDirtyAtBuild` (`git status --porcelain --untracked-files=no`), `buildTimestamp`,
`buildRepoRoot`. At runtime the CLI compares the embedded commit with the current HEAD of the
checkout it was built from. No mtime is consulted. `define` is a static substitution, so the
environment cannot forge provenance — under `tsx` the constant is absent and the runtime reports
`source`.

| status | meaning | production mutation |
| --- | --- | --- |
| `source` | running TypeScript directly | allowed |
| `verified` | embedded commit equals build repo HEAD, tree clean | allowed |
| `unverifiable` | provenance present, no build checkout on this machine | allowed |
| `stale` | commit differs from HEAD, or checkout dirty | **blocked** |
| `unknown` | no embedded commit, or built from a dirty tree | **blocked** |

## Commands protected

Fail closed: `push` (apply only), `migrate` (non-`--dry-run`), `db-reset`, `db restore`, `nuke`,
`reap`. Warn and continue: `push --plan`, `push --dry-run`, `migrate --dry-run`, `migrations list`.
Emergency override `FLUX_ALLOW_STALE_CLI=1` proceeds with a loud warning naming command and status.

## Verification

26 new tests (146 total in `@flux/cli`, 0 failures), `pnpm check:architecture` green, `tsc --noEmit`
green for `@flux/cli` and `@flux/core`, pooled-push adapter suite 23/23 in `@flux/core`.

Live matrix through the **installed binary**, not tsx:

| state | command | result |
| --- | --- | --- |
| built dirty → `unknown` | `flux db-reset` | blocked, exit 1 |
| clean build, HEAD matches → `verified` | `flux db-reset` | guard passes, normal validation |
| checkout moved to `460a4aa` → `stale` | `flux push` | blocked, names both SHAs |
| `stale` | `flux migrations list`, `flux push --plan` | warned, continued |
| `unknown` + override | `flux db-reset` | warned, proceeded |

Rebuilt CLI: version `2.0.1`, `sourceSha 3fc6ccef47a739e146425f754fd77a3cdc9d117c`, built
`2026-08-09T10:36:43Z`, `provenanceStatus: verified`.

## Follow-ups opened by this work

- **Control-plane provenance is unguarded.** The deployed dashboard decides pooled-push adaptation;
  there is no equivalent SHA check or preflight. Highest-value next step for migration safety.
- Pre-provenance bundles report `unknown` and are refused for production mutation. That is the
  intended bootstrap behavior, but any other machine running an old `flux` must rebuild once.
- Still open from Stage 10: single-file `--plan` preview message is mode-blind (cosmetic).

---

# Migration-safety controls — provenance of both halves of the boundary

**Rule of record:** *Production migration readiness requires both a verified CLI artifact and a
verified compatible deployed control plane.* Either alone is insufficient, because the CLI
transports SQL unmodified and the deployed control plane adapts it.

| Control | Status | Evidence |
| --- | --- | --- |
| CLI artifact provenance | **CLOSED** | Flux [#9](https://github.com/justinkemersion/Flux/pull/9), merged `16a8224` |
| Control-plane artifact provenance | **CLOSED IN PRODUCTION** | Flux [#10](https://github.com/justinkemersion/Flux/pull/10) + [#11](https://github.com/justinkemersion/Flux/pull/11), deployed `dc3e325` 2026-08-09 |
| Migration infrastructure | **READY** | `flux control-plane verify` → READY; disposable-tenant pooled-push smoke passed |

Both halves of the boundary are now verified in production. `flux control-plane verify` returns
READY and also satisfies the stricter `--require-sha-match`, because the deployed control plane
and the operator checkout are the same commit.

## Where control-plane provenance was lost (8 gaps)

`git pull` was opt-in; `.dockerignore` excludes `.git` so the image build could not learn its own
commit and nothing passed it in; no build args; mutable `flux-web:latest` tag; restart-only cycled
whatever `:latest` pointed at; no dirty-tree check; verification was liveness-only
(`State.Running` + an HTTP status code) with `docker image prune -f` then destroying the previous
image's identity; and no candidate step for web, unlike the gateway.

## What now holds

Provenance is resolved from the checkout before the build, passed as Docker build args, and
inlined by Next at compile time, so the container environment cannot impersonate it — proven on
the real artifact in CI by booting the built server with a conflicting `FLUX_BUILD_SOURCE_SHA`.
`GET /api/health` exposes `{version, sourceSha, dirtyAtBuild, buildTimestamp,
gatewayContractVersion, pooledPushAdapterContract}` and nothing else. `bin/deploy-web.sh` refuses
a dirty or non-git tree, verifies an unrouted candidate's commit before cutover, tags
`flux-web:<sha>`, and re-verifies the live container afterwards.

Readiness gates on **contract agreement**, not SHA equality: `FLUX_POOLED_PUSH_ADAPTER_CONTRACT`
is pinned to a SHA-256 digest of `pooled-push-sql-adapt.ts`, so the code that rewrites tenant SQL
cannot change without a deliberate bump or a CI failure. Requiring SHA equality would block every
application migration on an unrelated Flux commit; `--require-sha-match` is available for
operators who want it.

## Phase 7 — current production provenance (read-only)

**Deployed SHA: UNKNOWN.** No supported mechanism can establish it:

- `GET /api/health` → **404** (the endpoint ships in #10, not yet deployed)
- `GET /api/install/cli/version` → `{"version":"1.0.0"}`, an env-driven string, not a commit
- the image used the mutable tag `flux-web:latest`; no per-commit tag existed
- no Docker access to the control-plane host from the operator workstation (`DOCKER_HOST` unset)

**Established by read-only bracketing: the deployed control plane predates Flux #7 (`460a4aa`,
the lexical adapter hardening).** `460a4aa` added a "Pooled push SQL adaptation" section to
`docs/pages/architecture/bridge-jwts.md`, and the image serves `/app/docs` from the same
`COPY . .` layer as the dashboard bundle with no docs volume mount. The live page
`https://flux.vsl-base.com/docs/architecture/bridge-jwts` renders (control markers
`FLUX_GATEWAY_CONTRACT_VERSION` ×2, "bridge" ×7) but contains **none** of that commit's added
content. So the deployed `adaptPooledPushSql` is the pre-fix, whole-file regex version.

Therefore **Stage 10's pooled pushes were adapted by the pre-fix adapter**, regardless of the
`tsx`-against-source workaround — the workaround only governed the CLI, which does not adapt SQL.

### Impact assessment on Stage 10 (read-only, source inspection)

The pre-fix adapter differs from the fixed one only in *non-executable* contexts: comments,
string literals, quoted identifiers and dollar-quoted bodies. All four applied migrations were
audited:

| migration | `authenticated` total | in `--` comments | in strings | `$$` bodies | `ON SCHEMA public` | `GRANT authenticated TO` |
| --- | --- | --- | --- | --- | --- | --- |
| nd `0017` | 9 | 1 | 0 | 0 | 0 | 0 |
| nd `0018` | 26 | 2 | 0 | 0 | 0 | 0 |
| yc2 `0026` | 9 | 1 | 0 | 0 | 0 | 0 |
| yc2 `0027` | 46 | 2 | 0 | 0 | 0 | 0 |

No `format(`, no `E'` strings, no `DO` blocks in any of the four. The only text the pre-fix
adapter would have rewritten differently is prose inside `--` comment lines. **No executable
semantics differ between the two adapters for these files.**

### Result verified correct ≠ provenance historically proven

Both statements stand, and they are different claims:

- **Result verified correct.** Post-migration introspection confirmed the intended policies,
  composite keys, column-scoped `ON DELETE SET NULL`, forced RLS and absence of
  `WITH CHECK(true)`; live exploit testing rejected 32/32 cross-parent write classes while 18
  legitimate owner writes and 5 legitimate cross-owner social interactions succeeded.
- **Provenance not historically proven.** The exact commit that served those requests remains
  UNKNOWN, and the adapter generation is now known to have been the pre-fix one. Stage 10's
  correctness rests on direct verification of the outcome, not on artifact identity.

## Phase 8 — control-plane deploy, executed 2026-08-09

Web control plane only. The gateway, data plane and every application were left untouched:
`flux-node-gateway`, `flux-postgres-v2`, `flux-postgrest-pool` and `flux-pgbouncer` all kept their
original `StartedAt` and `RestartCount=0`; only `flux-web` was recreated.

| Field | Value |
| --- | --- |
| Deployed Flux SHA | `dc3e325866ccae6eea2acc76ebf1d4d2363a2777` |
| Image tag | `flux-web:dc3e325866ccae6eea2acc76ebf1d4d2363a2777` (id `6a484041ba18`, also `:latest`) |
| Build timestamp | `2026-08-09T11:32:59Z` |
| Runtime `/api/health` | `provenanceStatus: established`, `sourceSha` = deployed SHA, `dirtyAtBuild: false`, `version 0.1.0` |
| Adapter contract | `2.0.0` (digest-pinned to `pooled-push-sql-adapt.ts`) |
| Gateway contract | `1.0.0` |
| `flux control-plane verify` | **READY** (exit 0); also passes `--require-sha-match` |
| CLI provenance | `verified`, built from `dc3e325866cc`, matches checkout |

**Rollback identity, recorded before cutover.** Server checkout `/srv/platform/flux` was at
`6ab8984` (clean, `main`); `flux-web` ran image `a01fe4f10177` via the mutable `flux-web:latest`,
started `2026-08-08T15:30:17Z`, `RestartCount=0`. That image was tagged
**`flux-web:rollback-6ab8984`** first, because `:latest` moving would have left it dangling and
the deploy's `docker image prune -f` would have destroyed the only rollback target. Future deploys
do not need this step — every build now carries an immutable `flux-web:<sha>` tag.

**`6ab8984` independently confirms Phase 7's read-only bracketing.** It is the commit immediately
preceding `460a4aa` (Flux #7), which the docs-fingerprint method had already concluded. Two further
confirmations followed: the pre-fix adapter's distinguishing regex (`([^;]*?\bON\s+SCHEMA`) appears
8× in the rollback image and 0× in the deployed one, with `(?:GRANT|REVOKE)` exactly inverted; and
the doc section that read 0 before the deploy now reads 2 on the live site.

Two blockers surfaced and were fixed properly rather than worked around:

- **The server could not `git pull`.** `~/.ssh/config` pointed `github.com` at
  `id_ed25519_emersion`, with `IdentitiesOnly yes`, while the key registered as the repo's deploy
  key was `~/.ssh/github_deploy`. Corrected the `IdentityFile` (old config backed up). No source
  tree was copied.
- **The pre-cutover candidate was not inert.** It joined `flux-network`, so it could reach the
  `flux-system` catalog — and `instrumentation.ts` runs bootstrap DDL there and starts the backup
  scheduler on an immediate first tick. A container started only to be asked which commit it was
  built from could have mutated production before any cutover decision. Fixed in Flux
  [#11](https://github.com/justinkemersion/Flux/pull/11) before first use: bridge network, no
  Docker socket, with a guard test pinning the isolation.

### Disposable-tenant pooled-push smoke

Tenant `provctl-smoke-0809` (hash `df249a2`, uuid-derived schema `t_2a0d252c8d4a_api`), created
`v2_shared` for this purpose and destroyed afterwards. One synthetic migration carried five
adaptation canaries, each chosen so it persists in the database and can be introspected.

| Canary | Context | Required | Observed |
| --- | --- | --- | --- |
| 1 | `CREATE POLICY … TO authenticated` | adapt | `pg_policy.polroles` → `t_2a0d252c8d4a_role` |
| 1b | `GRANT … TO authenticated` | adapt | runtime role holds `SELECT,INSERT,UPDATE,DELETE` |
| 2 | `-- authenticated` line comment | verbatim | preserved (see note) |
| 3 | block comment, incl. nested `/*` | verbatim | preserved (see note) |
| 4 | string literal `'grant authenticated to impostor_role'` | verbatim | stored exactly, 0 role leaks |
| 4b | `COMMENT ON TABLE … 'authenticated' …` | verbatim | `obj_description` exact |
| 5 | dollar-quoted body + comment inside it | verbatim | `pg_proc.prosrc` exact, 0 role leaks |

Canary 4 is the decisive one: the pre-fix adapter armed on the `grant` **inside** that string
literal and rewrote to the next `;`, so a pre-fix control plane would have stored the tenant role
name in the row. It stored the literal untouched. Canaries 2 and 3 sit at file top level, where
comment text does not persist in the database; their in-body equivalent inside canary 5's
dollar-quoted body *is* preserved verbatim, and top-level comments are semantically inert.

Ledger: exactly one row, `tenant_schema = t_2a0d252c8d4a_api`, checksum
`1a689aa10b054efdee5c1a29f2c2b235d590f80cd91587795145aee3918f7539` — identical to the local file's
SHA-256, confirming the ledger records **pre-adapt** content and adaptation happens only at
execution.

Ownership and RLS: `canary` and `canary_id_seq` owned by `t_2a0d252c8d4a_ddl`; objects owned by the
runtime role **0**; schema and function owned by the DDL role; `relrowsecurity` and
`relforcerowsecurity` both true.

Auth/read/write smoke, synthetic data only, 6/6: anonymous read refused (401); owner insert 201;
owner reads exactly its own row; the DDL-inserted fixture row stays invisible under FORCE RLS;
cross-user read returns 0 rows; cross-owner insert rejected (403). The new tenant host had no ACME
certificate yet, so this ran against the gateway through an SSH tunnel with the tenant `Host`
header — same gateway tenant resolution, JWT verification, PostgREST and RLS path, minus edge TLS.

### Deprovision — and a lifecycle defect found

`flux nuke` reported success but **only deleted the catalog row**; it purged `v1_dedicated`-shaped
container/volume/network names that never exist for a pooled tenant. The schema, both roles, 5
owned objects and the ledger row all survived — which manufactures exactly the orphan-schema class
Pass 6b reports, and is a plausible origin of the 10 existing orphans. Filed as Flux
[#12](https://github.com/justinkemersion/Flux/issues/12); not fixed here, per this task's stop
condition.

Cleanup was completed with Flux's own canonical teardown, `buildDeprovisionSql()` from
`packages/engine-v2`, run transactionally rather than hand-rolled. Verified afterwards: schema
absent, both roles absent, objects owned by tenant roles 0, tenant ledger rows 0, no `canary`
relation or `canary_probe` function anywhere, catalog row gone, absent from `flux list`.

### Pass 6b reconciliation — before and after, identical

| | Pre-deploy | Post-cleanup |
| --- | --- | --- |
| catalogued rows / schemas present | 19 / 27 | 19 / 27 |
| catalogued schemas fully healthy (`DDLROLE=yes`, `RT_OWNED=0`, `UNFORCED=0`, `AUTHUSG=yes`) | 17 / 17 | 17 / 17 |
| orphans unadopted (no DDL role, `postgres`-owned) | 10 / 10 | 10 / 10 |
| `RT_OWNED != 0` anywhere | 0 | 0 |
| `UNFORCED != 0` | only `t_b86da057199a_api` = 2 | only `t_b86da057199a_api` = 2 |

**Correction to the 2026-08-08 entry above,** which read "19 catalogued schemas … 8 orphan
schemas". The reconciler's `catalogued=19` counts *catalog rows* (3 `v1_dedicated` + 16
`v2_shared`), not schemas on the shared cluster; 17 catalogued schemas are present and orphans are
`27 − 17 = 10`, not `27 − 19 = 8`. The substantive invariants were never wrong and have not
changed. Re-derive, never assume.

## Stage 10 resumption

**Unblocked.** All four preconditions hold as of 2026-08-09: control plane deployed via
`bin/deploy-web.sh` with candidate and live commit verified; `flux version --json` → `verified`;
`flux control-plane verify` → READY; disposable-tenant pooled-push smoke passed. No override is in
use — `FLUX_ALLOW_UNVERIFIED_CONTROL_PLANE` was never set, and the readiness gate is passing on its
own terms.

Stage 10's own migrations were **not** resumed in that task; it stopped after the deploy and
disposable-tenant verification by instruction.

### Historical distinction preserved

Deploying the fixed adapter does not retroactively change what served Stage 10.
`noisydesign 0017/0018` and `yeast-coast-2 0026/0027` were adapted by the **pre-fix** adapter on a
control plane whose exact commit was never proven — now known to have been the `6ab8984` image.
Their correctness continues to rest on the direct post-migration verification recorded above, not
on artifact identity.

### Follow-up noted, not actioned

`bin/deploy-web.sh`'s closing hint advises running `flux doctor control-plane`; the real command is
`flux control-plane verify`. An operator following the printed hint gets "unknown command". Left
for the next Flux change per the stop condition.

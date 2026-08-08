# 014 — Consolidate reference-app compatibility designs

## Goal

Resolve the PR #4 (`fixtures/reference-app`) vs PR #5 (`_compat/reference-app`) overlap into **one** canonical compatibility design before deploy/live testing.

## Decision

**Canonical layout:** `fixtures/reference-app/` + `pnpm foundry:compat` (PR #4 spine).

**Why:** Stronger capability model (local / live / Flux-core pending), baseline **0.6.0** + changelog, golden-app nesting, CLI (`--live` / `--json`), and honest pending encoding. Single ownership model aligned with baseline lifecycle (PR #3).

**Merged from PR #5:** pattern anchors, pure domain canaries, negative fixtures/tests (browser Flux + parent ownership), tags/session/archive coverage.

**Removed / not adopted:** `_compat/**`, `scripts/lib/compat-harness.ts`, alternate `plans/013-foundry-compat-harness.md` layout, live-probe fail-on-unauth semantics that conflict with Flux-core pending honesty.

## Checklist

- [x] Compare PR #4 vs PR #5 in detail
- [x] Base on PR #3 tip (via PR #4 stack)
- [x] Keep one command surface / CI path / docs set
- [x] Port PR #5 domain + negatives into `fixtures/reference-app/`
- [x] Ensure no stale `_compat` / duplicate framework
- [ ] Validate verify:template, golden-app, foundry:compat, negatives
- [ ] Stamp baseline fingerprints after landing

## Out of scope

- Deploy / live infra / secret rotation / destructive DB
- Collapsing golden-app into compat

# 013 — Foundry Reference Compatibility Harness

## Goal

Add a canonical, intentionally boring reference app/fixture that acts as a durable compatibility canary for Foundry-supported patterns — complementing PR #2 hardening and PR #3 baseline lifecycle without reimplementing them.

## Depends on

- Plan 011 (audit hardening) / PR #2
- Plan 012 (baseline lifecycle) / PR #3 — branch `cursor/slack-chat-command-a002`

## Checklist

- [x] Inspect open PR/branch state; base on newest Foundry work (PR #3 tip)
- [x] Add `fixtures/reference-app/` (manifest + ownership README)
- [x] Add `pnpm foundry:compat` / `foundry:reference:verify` with local vs live split
- [x] Vitest coverage for offline local checks + pending Flux-core markers
- [x] Wire CI + golden-app to run the harness
- [x] Document coverage in `docs/REFERENCE_APP.md`
- [x] Add minimal `docs/BASELINE_CHANGELOG.md` tied to baseline versions
- [x] Bump baseline to 0.6.0 + stamp fingerprints
- [x] Keep `foundry:verify:template` and `foundry:golden-app` passing

## Out of scope

- Deploy / mutate live infrastructure
- Inventing Flux-core JWT bridge / unauth gateway / schema-rewrite success
- Second production UI or duplicate app framework

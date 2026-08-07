# 012 — Foundry Baseline Lifecycle

## Goal

Evolve Foundry from a starter skeleton into a maintained baseline/SDK: versioned metadata, drift detection/reporting, golden generated-app validation, centralized security invariants, and AI guardrails — without automatic overwrite upgrades.

## Depends on

- Plan 011 (audit hardening) — branch `cursor/slack-chat-command-e7ac` / PR #2

## Checklist

- [x] Add `foundry.baseline.json` + stamp tooling for version/commit/fingerprints
- [x] Add `pnpm foundry:status` (current / behind / locally_customized / missing_security / unknown)
- [x] Centralize security invariants; reuse from status + Vitest
- [x] Extend `foundry:doctor` with local baseline/security summary (no Flux credentials)
- [x] Add `pnpm foundry:golden-app` + CI step
- [x] Add `AGENTS.md` + ADR for ownership/lifecycle
- [x] Cross-link dependency policy / forking / FOUNDRY_BASELINE.md
- [ ] Validate: verify:template, status (tree + fixtures), golden-app

## Out of scope

- Automatic `foundry upgrade` mutation of app files
- Flux-core changes / live deploy / secret rotation

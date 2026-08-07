# Plan 013 — Foundry compatibility reference harness

## Checklist

- [x] `_compat/reference-app` canonical canary (purpose, patterns map, domain models)
- [x] Negative fixtures for parent-ownership + browser Flux
- [x] `pnpm foundry:compat` local command (+ optional `FOUNDRY_COMPAT_LIVE=1`)
- [x] CI step after golden-app
- [x] AGENTS.md / ADR ownership updates
- [x] Reuse security invariants / probes (no second framework)

## Exit

Local compat canary green; verify:template + golden-app still pass; live probes optional and credential-gated.

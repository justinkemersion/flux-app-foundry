# 011 — Foundry audit hardening

Audit/upgrade pass to tighten tenant isolation, action error hygiene, script/doc drift, and local verification.

## Scope

- Child-table RLS parent-ownership for `notes` / `record_tags`
- Sanitize server-action errors (no Flux/body leakage)
- Seed/env/script guardrails and contract validator completeness
- Prompt/doc alignment with schema-less migrations + control-plane schema sync
- Tests for new behavior

## Out of scope

- Flux core gateway bridge (`mintBridgedTenantJwt`) — record as follow-up
- Production deploy, secret rotation, live DB push from this automation

## Checklist

- [x] Add `0006_child_record_ownership.sql` + RLS tests
- [x] Harden `actionError` + UUID/archive consistency in actions
- [x] Fix seed env loading, `.env.example`, contract validator, SQL placeholder check
- [x] Update prompts/docs/forking/sync wording; fix fork-check template string
- [x] Extend Flux fetch boundary test to `app/`
- [x] Run `pnpm foundry:verify:template` (and doctor where env allows)

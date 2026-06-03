# Cursor workflow contract

## Before coding

1. Read relevant `_contract/*.md` files (including `deploy.md` before shipping to a host, and `dependency-policy.md` when touching `package.json`)
2. Read the active `plans/NNN-*.md` checklist
3. Use a `prompts/*.md` template when applicable

## During implementation

- Touch only files required by the plan
- Keep files under anti-drift LOC limits
- Run `pnpm test` and `pnpm check:drift` before finishing

## After implementation

- Check off plan items
- Do not introduce new architectural layers without updating `_contract/`
- Deploy with **git only** (`_contract/deploy.md`): commit → push → `git pull` on the server; no rsync/scp of source

## Rules

`.cursor/rules/*.mdc` mirror contracts; prefer updating `_contract/` first, then rules.

## No-shim principle

If platform friction appears, fix upstream or document in a plan — do not add hidden compatibility shims.

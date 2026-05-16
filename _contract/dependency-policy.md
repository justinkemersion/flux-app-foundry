# Dependency Policy

## Source of truth

`flux-app-foundry` tracks the blessed baseline for Next.js, React, Tailwind, Auth.js, ESLint, TypeScript, and Flux SDK usage.

Forked apps inherit this baseline via `FOUNDRY_BASELINE.md` and periodic sync from upstream.

## Fork rule

Forked apps may pin versions temporarily, but must document why in `_drift/dependency-exceptions.md`.

Each exception needs: package name, pinned version, reason, owner, and review date.

## Update cadence

- **Patch updates:** allowed anytime; run `pnpm deps:check` and `pnpm foundry:verify` after.
- **Minor updates:** monthly maintenance pass using `prompts/upgrade-dependencies.md`.
- **Major updates:** only through a planned upgrade branch with its own plan file.

## Maintenance commands

| Command | Purpose |
|---------|---------|
| `pnpm deps:check` | List outdated packages |
| `pnpm deps:audit` | Security audit |
| `pnpm deps:update:minor` | Interactive update session (local only) |
| `pnpm foundry:verify` | Lint, typecheck, build — no product behavior change expected |

## Forbidden

- Random package additions without a plan in `plans/`.
- Installing overlapping UI libraries (e.g. second component kit alongside `components/ui`).
- Upgrading framework majors inside feature work.
- Skipping `pnpm foundry:verify` after dependency changes.

## CI

- Every PR: standard CI (`lint`, `typecheck`, `test`, `build`).
- Weekly: `.github/workflows/dependency-check.yml` runs `deps:check` and `deps:audit` (report only, no auto-upgrade).

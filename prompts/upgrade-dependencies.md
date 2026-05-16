# Upgrade dependencies

Upgrade dependencies **without changing product behavior**.

## Before you start

1. Read [`_contract/dependency-policy.md`](../_contract/dependency-policy.md).
2. Check [`_drift/dependency-exceptions.md`](../_drift/dependency-exceptions.md) for pinned packages (forks only).
3. Do not upgrade framework **majors** unless a dedicated plan exists in `plans/`.

## Process

1. Run `pnpm deps:check` and `pnpm deps:audit`; note starting state.
2. Update packages in **small groups** (e.g. lint tooling, then testing, then framework minors).
3. After each group: `pnpm foundry:verify` and `pnpm test`.
4. Document any required pins in `_drift/dependency-exceptions.md` with reason and review date.
5. Update `FOUNDRY_BASELINE.md` last-synced metadata if this is a fork.

## Forbidden

- Adding packages not required by the upgrade.
- Mixing feature work with dependency bumps.
- Auto-merging major bumps without a plan.

## Done when

- `pnpm foundry:verify` passes
- `pnpm test` passes
- No unexplained version pins

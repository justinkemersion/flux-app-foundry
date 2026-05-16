# First fork guide

Fork `flux-app-foundry` into a domain app without manual SQL hacks or baseline drift.

## 1. Create the repository

```bash
# GitHub: Use template / fork, or:
git clone git@github.com:justinkemersion/flux-app-foundry.git roommating
cd roommating
git remote set-url origin git@github.com:you/roommating.git
```

## 2. Rename and record baseline

1. Update `package.json` `name` to your app (e.g. `roommating`).
2. Edit `FOUNDRY_BASELINE.md`:

```md
Based on: flux-app-foundry
Baseline commit: <git rev-parse upstream-commit>
Last synced: 2026-05-16

Local deviations:
- (list domain-specific additions)
```

3. Keep `_drift/dependency-exceptions.md` empty unless you pin a package.

## 3. Environment

```bash
cp .env.example .env
# Fill AUTH_SECRET, OAuth, FLUX_URL, FLUX_GATEWAY_JWT_SECRET
pnpm install
```

## 4. Flux project

```bash
flux init    # or link existing project
flux push    # applies sql/migrations in API schema context
pnpm flux:schema:sync
```

Do **not** search-replace schema names in SQL. Migrations are unqualified; Flux applies them in `t_<hash>_api`.

## 5. Verify

```bash
pnpm foundry:doctor
pnpm foundry:new-app-check
pnpm foundry:verify
```

## 6. Domain work

- Add plans under `plans/` (e.g. `007-room-expenses.md`)
- Add SQL as `0006_*.sql` + grants file — never rewrite `0001`–`0005`
- Add routes under `app/(dashboard)/`
- Read `_contract/forking.md` before large changes

## 7. Ongoing maintenance

- Monthly: `pnpm deps:check`, follow `prompts/upgrade-dependencies.md`
- When syncing upstream: update `FOUNDRY_BASELINE.md` last-synced date

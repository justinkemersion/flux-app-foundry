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

1. Update `package.json` `name` to your app (e.g. `roommating`). UI title and `<title>` derive from this (title-cased) unless you set `NEXT_PUBLIC_APP_NAME` / `NEXT_PUBLIC_APP_TAGLINE` in `.env`.
2. Rebrand `README.md` for your domain.
3. Edit `FOUNDRY_BASELINE.md`:

```md
Based on: flux-app-foundry
Baseline commit: <git rev-parse upstream-commit>
Last synced: 2026-05-16

Local deviations:
- (list domain-specific additions)
```

4. Keep `_drift/dependency-exceptions.md` empty unless you pin a package.

## 3. Environment

```bash
cp .env.example .env
# Fill AUTH_SECRET, OAuth, FLUX_URL, FLUX_GATEWAY_JWT_SECRET
pnpm install
```

## 4. Flux project (before SQL)

Create and verify the Flux project **before** writing or pushing domain migrations. See [`docs/FLUX_WORKFLOW.md`](FLUX_WORKFLOW.md).

```bash
flux login
flux init              # or link existing project — updates flux.json slug + 7-char hash
# FLUX_URL + FLUX_GATEWAY_JWT_SECRET from: flux project credentials <slug> --hash <hash>

flux push sql/migrations/ --plan   # optional preview
flux push sql/migrations/          # versioned ledger — all pending files in order

pnpm flux:schema:sync  # writes FLUX_POSTGREST_SCHEMA to .env.local (v2 apiSchema)
pnpm flux:doctor       # control plane + gateway bridge probes
```

Do **not** search-replace schema names in SQL. Migrations are unqualified; Flux applies them in the tenant API schema (`t_<12hex>_api` on v2_shared).

## 5. Verify

**Fresh clone (no `.env` yet):**

```bash
pnpm foundry:verify:template
```

**Configured app (after `.env` + Flux sync):**

```bash
pnpm flux:doctor
pnpm foundry:doctor
pnpm foundry:new-app-check
pnpm foundry:verify
```

`foundry:verify` requires a configured app environment. `foundry:verify:template` checks repo structure and compiles with CI stub env only (no real secrets).

## 6. Domain work

- Add plans under `plans/` (e.g. `007-room-expenses.md`)
- Add SQL as `0006_*.sql` + grants file — never rewrite `0001`–`0005`
- Add routes under `app/(dashboard)/`
- Read `_contract/forking.md` before large changes

## 7. Ongoing maintenance

- Monthly: `pnpm deps:check`, follow `prompts/upgrade-dependencies.md`
- When syncing upstream: update `FOUNDRY_BASELINE.md` last-synced date
- After Flux platform changes: `pnpm flux:doctor`

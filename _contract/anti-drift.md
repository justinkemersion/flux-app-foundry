# Anti-drift contract

## Categories

1. **Architectural** — no ad-hoc services, no Flux fetch outside boundary
2. **Design** — no inline design systems on pages
3. **AI** — follow plans; no oversized files; no duplicate patterns

## File size limits

| Area | Max LOC |
|------|---------|
| `components/**/*.tsx` | 250 |
| `app/**/page.tsx`, `route.ts` | 300 |
| `lib/**/*.ts` (except `lib/flux/types.ts`) | 400 |

## CI gates

Run on every PR:

1. `pnpm install`
2. `pnpm foundry:verify:template` — lint, typecheck, test, drift checks, fork check, `foundry:status`, build (CI stub env; no `.env` file)
3. `pnpm foundry:golden-app` — materialize a fresh tree and validate generated output + status fixtures
4. `pnpm foundry:compat` — canonical reference-app compatibility harness (local/deterministic; live probes opt-in)

Forks with configured `.env` should also pass `pnpm foundry:doctor` and `pnpm foundry:verify` before merge.

## Baseline lifecycle

- `foundry.baseline.json` — version + fingerprints for Foundry-owned paths
- `pnpm foundry:status` — non-destructive drift report (`current` / `behind` / `locally_customized` / `missing_security` / `unknown`)
- `fixtures/reference-app/` + `pnpm foundry:compat` — compatibility canary for Foundry-supported patterns
- Baseline release notes: `docs/BASELINE_CHANGELOG.md`
- See `docs/adr/001-baseline-ownership.md` and `AGENTS.md`

## Vitest guards

- No raw `fetch` under `lib/` except `lib/flux/client.ts`, and none under `app/`
- Migrations contain RLS invariant and grants
- Child-table policies enforce parent ownership where applicable
- Centralized security invariants in `scripts/lib/security-invariants.ts` (also via `foundry:status`)

## Observability

Run `pnpm foundry:report` after structural changes. Reports land in `.local/reports/`; inventories in `docs/generated/`.

`pnpm check:graph` enforces circular-import and dependency-cruiser rules.

## Dependencies

Follow `_contract/dependency-policy.md`. Weekly CI runs `deps:check` and `deps:audit` (report only).

## Workflow

Major work starts with a plan in `plans/`. Execute one plan at a time.

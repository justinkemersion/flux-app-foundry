# Agent rules for Flux Foundry

Concise non-negotiables for Cursor/AI maintenance of this repository and forks. Details live in `_contract/` and `docs/adr/001-baseline-ownership.md`.

## Security

1. **Never weaken tenant/RLS isolation** to make tests pass. Preserve `(jwt.sub) = user_id` and child-row parent ownership (`0006_*`).
2. **Never expose Flux credentials or API access browser-side.** No `NEXT_PUBLIC_FLUX_*`, no Flux JWT/secrets in client components, no raw `fetch` to Flux outside `lib/flux/client.ts`.
3. **Preserve fail-closed auth and error handling.** Unauthenticated access fails closed unless a route is explicitly public. `actionError` must not leak Flux/HTTP bodies.
4. **Never bypass or fake `foundry:doctor` / `flux:doctor` failures.** Report environment/credential limits honestly.

## Foundry vs Flux-core

5. **Never invent Flux-core behavior from this repo.** Foundry consumes Flux via contracts in `_contract/flux.md` and `_contract/flux-workflow.md`. Platform gaps are Flux-core follow-ups, not local shims.

## Baseline lifecycle

6. **Distinguish Foundry-owned vs app-owned files.** Foundry-owned: `_contract/`, `lib/flux/`, Foundry/Flux scripts, CI workflows, security migrations, `foundry.baseline.json`, `AGENTS.md`. App-owned: domain routes, UI copy, `FOUNDRY_BASELINE.md` contents, dependency exceptions, new numbered migrations.
7. **Do not blind-overwrite app customizations.** Use `pnpm foundry:status` to detect drift; sync owned paths deliberately.
8. **After baseline/template changes**, run `pnpm foundry:verify:template` and `pnpm foundry:golden-app`, and re-stamp with `pnpm foundry:baseline:stamp` when maintaining upstream Foundry.

## Workflow

9. Follow `plans/` incrementally. No deploy shims (`rsync`/`scp` of source trees). Finish with `pnpm check:drift` / `pnpm foundry:doctor` as appropriate.

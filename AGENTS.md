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

6. **Distinguish Foundry-owned vs app-owned files.** Foundry-owned: `_contract/`, `lib/flux/`, Foundry/Flux scripts, CI workflows, security migrations, `foundry.baseline.json`, `AGENTS.md`, `fixtures/reference-app/`. App-owned: domain routes, UI copy, `FOUNDRY_BASELINE.md` contents, dependency exceptions, new numbered migrations.
7. **Do not blind-overwrite app customizations.** Use `pnpm foundry:status` to detect drift; sync owned paths deliberately.
8. **After baseline/template changes**, run `pnpm foundry:verify:template`, `pnpm foundry:golden-app`, and `pnpm foundry:compat`, and re-stamp with `pnpm foundry:baseline:stamp` when maintaining upstream Foundry. Record baseline bumps in `docs/BASELINE_CHANGELOG.md`.

## Reference compatibility

9. **Keep the canonical reference harness honest.** Only `fixtures/reference-app/` + `pnpm foundry:compat` — do not introduce a parallel `_compat/` framework. Prove patterns offline (including domain/negative canaries). Mark Flux-core/live gaps as pending — never shim or fake gateway/JWT/schema-rewrite success.
10. **Local vs live Flux checks:** `foundry:compat` (default) needs no Flux credentials. Live probes require `--live` / `FOUNDRY_COMPAT_LIVE=1` plus safe test credentials — never embed secrets.

## Workflow

11. Follow `plans/` incrementally. No deploy shims (`rsync`/`scp` of source trees). Finish with `pnpm check:drift` / `pnpm foundry:doctor` as appropriate.

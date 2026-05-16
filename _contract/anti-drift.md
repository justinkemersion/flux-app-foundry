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
2. `pnpm lint`
3. `pnpm typecheck`
4. `pnpm test`
5. `pnpm check:file-sizes`
6. `pnpm check:imports`
7. `pnpm check:contracts`
8. `pnpm build`

## Vitest guards

- No raw `fetch` under `lib/` except `lib/flux/client.ts`
- Migrations contain RLS invariant and grants

## Dependencies

Follow `_contract/dependency-policy.md`. Weekly CI runs `deps:check` and `deps:audit` (report only).

## Workflow

Major work starts with a plan in `plans/`. Execute one plan at a time.

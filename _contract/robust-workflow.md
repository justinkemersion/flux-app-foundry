# Robust workflow contract

Foundry forks and Flux-related apps follow **documented, revisioned workflows**. Shortcuts that bypass them create drift, untraceable production state, and hidden coupling.

This contract ties together deploy, cursor, anti-drift, and platform rules. When in doubt, **fix the platform or update a plan** — do not improvise a one-off path.

## Non-negotiable boundaries

| Boundary | Contract | Violation examples |
|----------|----------|-------------------|
| **Source of truth** | [`deploy.md`](deploy.md) | `rsync`/`scp` of repo trees, deploying uncommitted agent edits |
| **No shims** | [`cursor-workflow.md`](cursor-workflow.md) | Compatibility layers, duplicate clients, “temporary” forks of upstream behavior |
| **Plans & scope** | [`cursor-workflow.md`](cursor-workflow.md), [`anti-drift.md`](anti-drift.md) | Cross-repo drive-by refactors, oversized files, skipping `pnpm check:drift` |
| **Flux platform** | [`flux-workflow.md`](flux-workflow.md) | SQL before `flux init`, empty `FLUX_POSTGREST_SCHEMA` in `.env`, minting tenant roles in app code |
| **Architecture** | [`architecture.md`](architecture.md) | New fetch boundaries, ad-hoc services, design drift on pages |

## No shims (explicit)

A **shim** is any hidden adapter whose purpose is to avoid fixing the real problem:

- Second code path for the same capability (e.g. Supabase + Flux clients when one backend is canonical)
- “Just for prod” env branching without a contract update
- Copy-paste deploy scripts that replace `git pull`
- Agent workarounds (manual file sync, editing server source) not reflected in `origin`

**Allowed:** thin, documented boundaries called out in `_contract/` (e.g. `lib/flux/client.ts`). **Not allowed:** undeclared shortcuts.

## Robust deploy sequence

1. Implement on a branch or `main` per team practice; satisfy tests and drift checks locally.
2. **Commit and push** to the canonical remote.
3. On the host: **`git pull`** (or deploy a CI image built from that SHA).
4. Run documented install steps (`pnpm install`, `flux push`, `docker compose`, systemd installers).
5. Verify with repo scripts (`pnpm flux:doctor`, `pnpm foundry:doctor`, service health).

Secrets may be installed out-of-band; they never replace step 3 for **code**.

## Valid exceptions

Document in a `plans/NNN-*.md` item or an explicit ops note:

- First-time host bootstrap before `git clone` exists
- Emergency when git/CI is unreachable (must return to git traceability immediately after)
- Upstream platform fix in flight (time-boxed; no permanent shim)

## Agents

1. Read `_contract/*.md` relevant to the task before coding.
2. Prefer **upstream fixes** and **contract updates** over local workarounds.
3. Never deploy application source except via **git** (see [`deploy.md`](deploy.md)).
4. Finish with the repo’s verification commands, not “it works on my machine.”

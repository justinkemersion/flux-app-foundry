# Deploy contract

Foundry forks and Flux platform work must treat **git as the source of truth** for application and contract code on every host.

## Non-negotiable

1. **Commit and push** to the canonical remote before deploying to shared or production environments.
2. On servers, **update checkouts only with git** (`git pull`, or deploy a CI-built artifact tagged with a commit SHA).
3. Run the repo’s documented post-pull steps (`pnpm install`, `flux push`, `docker compose build`, systemd install scripts, etc.).

## Forbidden without written excuse

- `rsync`, `scp` of source trees, or copying working-tree files to bypass git
- Leaving a server checkout dirty with changes that are not on `origin`
- “Quick sync” of uncommitted agent edits to production

Environment and secrets files stay out of git; copying `.env` with `scp` is fine for secrets only, not for code.

## Valid exceptions (document in plan or ops note)

- Greenfield bootstrap before the first `git clone`
- Git or network unavailable for an emergency hotfix (return to git ASAP)
- CI/CD delivers immutable artifacts built from a known commit (still git-traced, not rsync)

## Agent workflow

Prefer: merge to main → push → SSH `git pull` → install/restart. See also `_contract/cursor-workflow.md`.

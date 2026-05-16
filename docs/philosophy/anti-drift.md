# Anti-drift

Drift is the slow corruption of a codebase's shape.

It appears as:

- One-off components that ignore the design system
- Flux `fetch` calls outside the HTTP boundary
- Migrations with hand-edited placeholders
- Files that grow without splitting
- Dependencies added without a plan

## Enforcement layers

1. **Contracts** — short, human-readable laws
2. **CI** — lint, typecheck, test, graph, build
3. **Reports** — `pnpm foundry:report` makes state visible
4. **Process** — plans executed incrementally

Drift is not a moral failure. It is a systems problem. Measure it, then fix the system.

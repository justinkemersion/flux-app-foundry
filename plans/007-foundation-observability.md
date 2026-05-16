# Plan 007 — Foundation observability

Milestone **0.3** — repository observability, not product monitoring.

## Goal

Make architectural drift visible, measurable, and enforceable over time.

## Checklist

- [x] `pnpm foundry:report` → `.local/reports/` + `docs/generated/`
- [x] Reports: architecture, import-boundaries, oversized-files, dependency-summary, route-map
- [x] Generated inventories: `docs/generated/routes.md`, `components.md`
- [x] `pnpm check:graph` — madge circular + dependency-cruiser
- [x] Architectural metrics in architecture report
- [x] `docs/philosophy/` essays
- [x] Wired into `check:drift` and documented in README / `_contract/`

## Exit

`pnpm foundry:report` produces fresh reports. `pnpm check:graph` fails on circular imports or forbidden edges.

## Deferred

Stripe, realtime, AI runners, image generation — until observability is routine in fork workflow.

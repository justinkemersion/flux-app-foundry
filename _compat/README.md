# Foundry compatibility harness

**Purpose:** Continuously prove that the supported Foundry baseline patterns still work together. This is a compatibility canary, not a product demo.

**Ownership:** Foundry-owned. Changes to shared contracts, security migrations, `lib/flux/`, server-action error handling, or CI must keep `pnpm foundry:compat` green.

## Layout

| Path | Role |
|------|------|
| `reference-app/` | Canonical boring reference surface + pattern map |
| `reference-app/domain/` | Pure TypeScript models of supported patterns |
| `reference-app/fixtures/negative/` | Deliberate bad patterns for negative tests |
| `reference-app/live/` | Optional live Flux probe contract (credentials required) |
| `tests/` | Local regression + negative tests (no Flux credentials) |

## Commands

```bash
pnpm foundry:compat              # local compatibility canary (CI)
FOUNDRY_COMPAT_LIVE=1 pnpm foundry:compat   # also run live probes
```

## Local vs live

| Mode | Requires | Covers |
|------|----------|--------|
| **Local** (default) | Nothing beyond repo + `pnpm install` | Pattern anchors, security invariants, ownership/auth/archive/validation regressions, negative browser-Flux & parent-ownership fixtures |
| **Live** (`FOUNDRY_COMPAT_LIVE=1`) | Safe test Flux credentials (`FLUX_URL`, JWT secret, schema) | Gateway probes from `scripts/lib/flux-probes.ts` — never destructive DB work |

Live mode must not embed secrets. Without credentials it fails closed with a clear message (does not silently pass).

## Relationship to other gates

- `foundry:golden-app` — materializes a full tree + status fixtures (stale/legacy/insecure)
- `foundry:compat` — domain/pattern canary against the supported baseline
- Both reuse `runSecurityInvariants` / baseline machinery; do not invent a second framework

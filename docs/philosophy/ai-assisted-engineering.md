# AI-assisted engineering

AI accelerates implementation. It does not replace architecture.

In Foundry-shaped projects, the repository is the constraint system:

- `_contract/` defines laws
- `plans/` define execution phases
- CI and `foundry:*` scripts make drift visible

The model proposes; the contracts dispose.

## Rules of thumb

1. Read contracts and the active plan before generating code.
2. Prefer extending existing patterns over inventing parallel ones.
3. Run `pnpm foundry:verify` before claiming done.
4. When the model drifts, fix the guardrail — not just the symptom.

## What AI is bad at without structure

- Remembering decisions from last week
- Resisting shiny abstractions
- Keeping import boundaries honest
- Matching visual design without a token system

Foundry exists so AI can be fast **inside** a stable frame.

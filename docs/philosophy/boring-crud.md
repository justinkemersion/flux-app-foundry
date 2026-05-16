# Boring CRUD

The first milestone is not impressive. It is **reliable**.

Generic records, notes, tags, activity feeds, and profiles exist to prove:

- Auth works
- RLS works
- Server actions work
- The design system works
- Forking works

## Why boring wins

Exciting features hide architectural debt. CRUD exposes it immediately.

If you cannot ship boring CRUD with clean contracts, you should not ship realtime, billing, or AI runners yet.

## The bar

- Small files
- Explicit contracts
- Repeatable setup (`foundry:doctor`)
- Visible architecture (`foundry:report`)

Boring CRUD excellence is the foundation everything else stands on.

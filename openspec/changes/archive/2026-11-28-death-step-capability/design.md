# Design

## Context

`sv.ts` builds the conditional death steps for Sweetheart, Barber, Sage and
Klutz by reading `roleModule(...).deathStep`. The legacy field is a
`NightStepSpec`, so the step itself is already typed; only its ownership is
not. A role that has moved to `capabilities` could not move its death step
without a second declaration form.

## Decision

Add:

```ts
| { readonly kind: "death-step"; readonly step: NightStepSpec }
```

and `deathStepOf(module)` in `night-step.ts`. The accessor prefers the arm and
falls back to `module.deathStep`, so the four roles can migrate one at a time
without changing the queue builder.

The Klutz moves first. Its step is the same `one-any` note step with the same
`diedRecently`/`used.klutz` actor; no resolver or new engine branch is added.

## Risks / Trade-offs

- A module that declares both forms would silently prefer the arm. The
  accessor makes that explicit; the existing role-ownership generator reports
  the declaration form, so the ledger exposes a duplicate.
- The engine still owns the death step insertion and completion; this change
  moves the declaration only.
- The legacy fallback stays until the other three roles migrate, which the
  inventory tracks.

## Test plan

- `src/core/roles/klutz/role.test.ts`: the death-step arm exists; the Klutz has
  no night step; a living candidate is refused.
- Existing Klutz engine, day-action and browser tests stay unchanged.
- `scripts/role-ownership.test.ts` and the generated ledger.
- Full `npm test`, `npm run verify`, gates, acceptance and OpenSpec.

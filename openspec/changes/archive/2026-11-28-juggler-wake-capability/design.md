# Design

## Context

`RoleModule.nightStep` and `nightStep` capability arms both end in
`NightStepSpec`. `nightStepFor` reads the capability arm when a module has one;
otherwise it falls back to the legacy field. The Juggler's only legacy content
is the step shape and the `actor` predicate that decides whether the Juggler
wakes after its guessing day.

## Decision

Declare the existing step as:

```ts
capabilities: [
  {
    kind: "night-step",
    timing: "other",
    step: { target: "none", infoKind: "number", actor(...) { ... } },
  },
]
```

No `resolve` is declared. The engine already owns the answer, the guess ledger
and the log line; the migration changes only who declares the wake.

## Risks / Trade-offs

- The `actor` predicate stays in the role module; it is the same function, so
  the guessing-day and spent checks cannot drift.
- The Juggler is not a first-night role; `timing: "other"` matches the printed
  order and the existing tests.
- The ownership ledger changes from `nightStep`/engine branch to
  `capability:night-step`/capability + engine reference, which is the intended
  sign-off.

## Test plan

- `src/core/roles/juggler/role.test.ts`: night 1 has no step; nights 2 and 3
  have the number step and no resolver; the actor wakes on the night after the
  guessing day, not on the guessing day, and never after `used.juggler`.
- `src/core/roles/night-step.test.ts`: the arm still agrees with the printed
  S&V other-night order.
- `scripts/role-ownership.test.ts` and the generated ledger.
- Full `npm test`, `npm run verify`, gates, acceptance and OpenSpec.

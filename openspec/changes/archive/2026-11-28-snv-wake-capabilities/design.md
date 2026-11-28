# Design

## Context

`RoleModule.nightStep` and `nightStep` capability arms both end in
`NightStepSpec`. `nightStepFor` reads the capability arm when a module has one;
otherwise it falls back to the legacy field. Each of the three roles has only
one legacy declaration: the step shape and the `actor` predicate that decides
whether the holder wakes tonight.

All three characters appear in both `SV_NIGHT_FIRST` and `SV_NIGHT_OTHER`
(`src/core/model/rules.ts`), so one arm covers every night they wake.

## Decision

Declare the existing step on each module as:

```ts
capabilities: [
  {
    kind: "night-step",
    timing: "any",
    step: { /* the unchanged step and actor */ },
  },
]
```

No `resolve` is declared. The engine already owns the S&V step completion, the
information answers and the Witch curse; the migration changes only who
declares the wake.

The step shapes stay exactly as they were:

- Philosopher: `target: "none"`, `optional: true`, `infoKind: "note"`, actor
  wakes a still-waking, unspent holder.
- Seamstress: `target: "two"`, `optional: true`, `infoKind: "note"`, actor
  wakes a still-waking, unspent holder.
- Witch: `target: "one-any"`, `infoKind: "note"`, actor wakes a still-waking
  holder while more than three players live.

## Risks / Trade-offs

- The `actor` predicates stay in the role modules as the same functions, so the
  wake conditions cannot drift.
- `timing: "any"` matches the two printed night orders; the existing
  `night-step.test.ts` order check fails if an arm disagrees.
- No resolver means `nightResolverFor` stays undefined; the engine's stored
  answer, once-per-game flag and curse path are untouched.
- The ownership ledger changes from `nightStep`/engine branch to
  `capability:night-step`/capability + engine reference, which is the intended
  sign-off.

## Test plan

- `src/core/roles/philosopher/role.test.ts`, `seamstress/role.test.ts` and
  `witch/role.test.ts`: the arm is a `night-step` with `timing: "any"`, the
  legacy field is gone, the step shape is identical on nights 1, 2 and 3, no
  resolver exists, and the actor predicate keeps its first/later-night,
  spent/dead and living-count behavior.
- `src/core/roles/night-step.test.ts`: the arm agrees with the printed S&V
  night order and no module mixes an any-night arm with another arm.
- `src/core/engine/snv.test.ts`: every existing wake, answer and curse test
  stays green.
- `scripts/role-ownership.test.ts` and the regenerated ledger.
- Full `npm test`, `npm run verify`, gates, acceptance and OpenSpec.

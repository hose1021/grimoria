# Design

## What the engine did

```ts
// sv.ts, svInfoForStep
if (role === "mathematician") {
  const value = abnormalCount(state); // distinct state.abnormal playerIds
  const options = falsified
    ? numberChoices(orderedPlayers(state).length).filter((choice) => !vortox || choice !== value)
    : [];
  // the shared wrapper: impaired, needsChoice, suffixes, textKey, text
}
```

`abnormalCount` lived in `sv.ts` and was exported through `engine/index.ts`.
`completeSvStep` cleared `state.abnormal` after the step, and `night.ts` cleared
it too when the actor was skipped.

Three facts matter for a behavior-preserving move:

1. **The value is the role's rule.** Mathematician r3153: "Each night, you
   learn how many players' abilities worked abnormally (since dawn) due to
   another character's ability." The engine counts the distinct players the
   Storyteller marked; it never infers a cause.
2. **Who answers is the engine's.** The role returns the true count and the
   full possible set whether or not its owner is drunk or poisoned. The engine
   alone opens the host question, and a living, unimpaired Vortox removes the
   true value from the offered answers.
3. **The range is the seat count.** The old branch used
   `numberChoices(orderedPlayers(state).length)`; `validateState` enforces
   `players` and `order` to have the same length and every order id to resolve,
   so this equals `seatIds.length`.

## The one new fact

```ts
/**
 * How many distinct players carry an ABNORMAL reminder since the last
 * Mathematician wake. The count only: a mark's reason is a secret.
 */
readonly abnormalCount: number;
```

`informationFacts` supplies it by calling the moved `abnormalCount(state)`,
which dedups by `playerId` exactly as before. A legacy save with two marks for
one player still answers one. Only a scalar reaches a role: the reasons stay in
private state and never enter the context, a log line or a public projection.

## The move, not an export

`abnormalCount` had to leave `sv.ts` without breaking the public import.
Exporting it from `information-facts.ts` and re-exporting the binding from
`sv.ts` keeps `engine/index.ts` and every caller unchanged. `sv.ts` already
imports `informationFacts` from that module, so the direction is the existing
one and no cycle opens. The fact builder imports no engine path that imports
`sv.ts`.

## Role

Mathematician (r3153), timing `any`, step `{ target: "none", infoKind:
"number" }`:

- `value`: `context.abnormalCount`;
- `possible`: every number from 0 to the seat count.

The resolver reads no other fact, does not read `impaired`, and cannot mark its
answer false: the type check in `ability.test-d.ts` forbids it.

## Kept on purpose in `svInfoForStep`

- `impaired = isImpaired(state, actor.id, currentAt(state))`;
- `vortoxFalsifies(state, role)`: living, unimpaired Vortox and a townsfolk
  role;
- options: `possible` without the true value only under a Vortox; otherwise the
  full possible set for an impaired owner;
- `falsifiedSuffix: vortox` and `mayBeFalseSuffix: impaired && !vortox`, so the
  both-at-once case keeps the Vortox flags;
- `textKey: "note.sv.mathematician"`, the stored Russian `text` and
  `kind: "number"`.

The ledger clear stays in the engine (`completeSvStep`, and the skipped-actor
path in `night.ts`). A resolver is pure.

## Not in this change

- The Dreamer, Evil Twin, Flowergirl and Town Crier branches.
- Moving the ledger clear into a completion hook.
- Presentation moved into the decision; the ledger keeps `sv.ts` as the
  reference for the wording.
- Any rules pin or matrix row change.

## Compatibility and proof

No storage, command, journal, schema or pin changes.

1. The role tests and a preview/apply/replay/undo/export characterization for
   one Mathematician step were added before the move. The role tests fail on
   the untouched branch because the module owns no answer; the engine
   characterization passes before and after.
2. The existing count, dedup, clear, privacy, preceding-day and Vortox tests
   stay unchanged as the regression gate. The both-at-once case, the
   false-information journal case and the duplicate-mark fact are added.
3. The stored `given` asserted by `snv.test.ts` keeps its exact value, text
   key, text and flags.

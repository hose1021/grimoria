# Design

## What the engine did

```ts
// sv.ts, svInfoForStep
if (role === "clockmaker") {
  // first Demon in seat order, every Minion in play (alive or dead)
  // circular distance min(|a - b|, seats - |a - b|), 0 with no Demon or Minion
  const value = distance ?? 0;
  // options: numberChoices(seatCount), less the true value under a Vortox
}

if (role === "oracle") {
  const value = orderedPlayers(state).filter(
    (player) => !player.alive && realTeamOf(player) === "evil",
  ).length;
  // the same options
}
```

Both branches then built the same wrapper: `impaired`, `needsChoice`,
`falsifiedSuffix`, `mayBeFalseSuffix`, `textKey`, `textVars` and the Russian
`text` fallback.

Three facts matter for a behavior-preserving move:

1. **The value is the role's rule.** The Clockmaker learns the distance to the
   nearest Minion; a Minion who is dead is still in play (Glossary "In play").
   The Oracle counts the dead players whose alignment is evil, from the current
   roster, not death events.
2. **Who answers is the engine's.** The role returns the true value and the
   full possible set whether or not its owner is drunk or poisoned. The engine
   alone opens the host question, and a living, unimpaired Vortox removes the
   true value from the offered answers.
3. **The range is the seat count, not the player count.** The old branch used
   `numberChoices(orderedPlayers(state).length)`, which is the seat order
   length, and the role now uses `context.seatIds.length`.

## The one new fact

```ts
/** Whether the player is alive now, dead players included in `seatIds`. */
isAlive(playerId: string): boolean;
```

`seatIds` is every seat in order; the Oracle needs both facts together to count
the dead evil players. `informationFacts` answers it from the roster and
returns false for an unknown seat, matching `hasPlayer`. No role gains access
to the game state.

## Role

Clockmaker (r2967), timing `first`, step `{ target: "none", infoKind:
"number" }`:

- `value`: the circular seat distance from the Demon to the nearest Minion in
  play, alive or dead; 0 when no Demon or no Minion exists;
- `possible`: every number from 0 to the seat count.

Oracle (r2909), timing `other`, the same step shape:

- `value`: the number of seats whose player is dead and registers as evil.
  `svInfoForStep` passes no registrations, so this is the real team, exactly
  as the engine counted it;
- `possible`: every number from 0 to the seat count.

Neither resolver reads `impaired`, and neither can mark its answer false: the
type check in `ability.test-d.ts` forbids it.

## The extract, not an export

`informationFacts` was private to `information.ts`, and `information.ts`
imports `sv.ts`. Exporting the fact builder from `information.ts` would close
the cycle `sv.ts → information.ts → sv.ts`. The shared fact builders therefore
move to `information-facts.ts`:

- `registrationApplies`, `alignmentOf`, `registersAsDemon`,
  `registersAsTownsfolk`, `registersAsMinion`, `registersAsOutsider`,
  `characterChoices`, `executedOn` and `informationFacts`;
- `information.ts` imports what it still uses and re-exports the public names,
  so `engine/index.ts` and the application read models are unchanged;
- `sv.ts` imports only `informationFacts`.

No behavior moves in the fact builder. `information.ts` remains the
dispatcher; `information-facts.ts` is a coordinator in the ownership ledger so
the Recluse and Spy registration references do not disappear from it.

## Kept on purpose in `svInfoForStep`

- `impaired = isImpaired(state, actor.id, currentAt(state))`;
- `vortoxFalsifies(state, role)`: living, unimpaired Vortox and a townsfolk
  role;
- options: `possible` without the true value only under a Vortox; otherwise
  the full possible set for an impaired owner;
- `falsifiedSuffix: vortox` and `mayBeFalseSuffix: impaired && !vortox`, so
  the both-at-once case keeps the Vortox flags;
- `textKey`, `textVars`, `text`, `kind: "number"`.

`validateGiven`, `givenIsLegal`, `caseForStep` and `recordHostChoice` are
untouched, so an impaired or Vortox answer stays `false-information` and a
healthy answer asks nobody.

## Not in this change

- The Dreamer, Flowergirl, Town Crier, Mathematician and Evil Twin branches.
- Presentation moved into the decision; the ledger keeps `sv.ts` as a
  reference for both roles.
- Any rules pin or matrix row change.

## Compatibility and proof

No storage, command, journal, schema or pin changes.

1. Role tests and an engine preview/apply/replay/undo/export test for one step
   of each role were added before the move. The role tests fail on the
   untouched branch because the modules own no answer; the engine
   characterization passes unchanged before and after.
2. The existing Clockmaker, Oracle, Vortox and impairment tests stay
   unchanged as the regression gate, and the both-at-once case and the
   impaired journal case are added.
3. The stored `given` records asserted by `snv.test.ts` keep their exact
   values, text keys, texts and flags.

# Design

## What the engine did

```ts
// sv.ts, svInfoForStep
if (role === "flowergirl" || role === "towncrier") {
  const day = lastDayFor(state); // number === night - 1, nominations is an array
  if (!day || day.voteCounts !== undefined) {
    // note.sv.noDay: a host answer, not false information
  }
  const value = Boolean(
    day.nominations.some((nomination) => {
      if (role === "towncrier") {
        if (typeof nomination.minionNomination === "boolean") return nomination.minionNomination;
        return roleTeam(playerById(state, nomination.nominatorId)?.roleId || "") === "minion";
      }
      if (Array.isArray(nomination.demonVoters)) return nomination.demonVoters.length > 0;
      return (nomination.votes || []).some(
        (id) => roleTeam(playerById(state, id)?.roleId || "") === "demon",
      );
    }),
  );
  // the shared wrapper: impaired, needsChoice, options, suffixes, textKey, text
}
```

Three facts matter for a behavior-preserving move:

1. **The value is the roles' rule.** Flowergirl r2907 asks whether a Demon
   voted today; Town Crier r3145 asks whether a Minion nominated today. The
   snapshot fields record the team at vote or nomination time, so a later
   character change is not read back into the answer.
2. **The fallback reads current roles.** A legacy ledger without
   `demonVoters` or `minionNomination` falls back to the current roles of the
   voters and the nominator, exactly as `recordVotes` and `nominate` would
   have written them.
3. **Who answers is the engine's.** The role returns a boolean and both
   possible values whether or not its owner is drunk or poisoned. The engine
   alone opens the host question, and a living, unimpaired Vortox removes the
   true value from the offered answers.

## The one new fact

```ts
readonly votesToday: {
  readonly demonVoted: boolean;
  readonly minionNominated: boolean;
} | null;
```

`votesOn(state, dayNumber)` reproduces `lastDayFor` exactly: `day.number ===
dayNumber`, `Array.isArray(day.nominations)` and `day.voteCounts ===
undefined`. The check is `!== undefined`, not truthiness: `{}` already means
"manual ledger", so an empty total map is still no answer. The date is
`query.at.number - 1`, the same reading as `executedToday`; any other day
could answer a reloaded stale `lastDay`.

## Role

Flowergirl (r2907), timing `other`, step `{ target: "none", infoKind:
"yes-no" }`:

- `value`: `Boolean(context.votesToday?.demonVoted)`;
- `possible`: `[true, false]`.

Town Crier (r3145), the same step shape:

- `value`: `Boolean(context.votesToday?.minionNominated)`;
- `possible`: `[true, false]`.

The role tests make every other fact throw, including `impaired`, so a role
that reads the Vortox or its own impairment fails. The engine handles the null
fact before it reads a decision.

## Kept on purpose in `svInfoForStep`

- the ended-day guard, now `facts.votesToday === null`, returning the identical
  `note.sv.noDay` record with `hostAnswer: true` and `options: [true, false]`;
- `impaired = isImpaired(state, actor.id, currentAt(state))`;
- `vortoxFalsifies(state, role)`: living, unimpaired Vortox and a townsfolk
  role;
- options: `possible` without the true value only under a Vortox; otherwise
  the full possible set for an impaired owner;
- `falsifiedSuffix: vortox` and `mayBeFalseSuffix: impaired && !vortox`;
- `textKey` `note.sv.flowergirlYes`/`flowergirlNo`/`towncrierYes`/
  `towncrierNo`, the stored Russian `text` and `kind: "yes-no"`.

`validateGiven`, `givenIsLegal`, `caseForStep` and `recordHostChoice` are
untouched, so a healthy answer asks nobody, an impaired or Vortox answer stays
`false-information`, and a missing ledger stays a host answer.

## Not in this change

- The Dreamer and the Evil Twin.
- Presentation moved into the decision; the ledger keeps `sv.ts` as the
  reference for the wording.
- Any rules pin or matrix row change.

## Compatibility and proof

No storage, command, journal, schema or pin changes.

1. Role tests for both modules and a fact test for `votesOn` were added before
   the move. They fail on the untouched branch because the modules own no
   answer and `votesOn` is not exported; the engine fallback test passes
   before and after.
2. The existing ended-day, impairment, Vortox, no-day, manual-ledger and
   vote-time-snapshot tests stay unchanged as the regression gate.
3. The stored `given` records asserted by `snv.test.ts` keep their exact
   values, text keys, texts and flags.

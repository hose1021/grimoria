# Sects & Violets information roles as capabilities: Clockmaker and Oracle

Issue: #211

## Why

The Clockmaker's distance and the Oracle's count are still computed in
`svInfoForStep`. The Clockmaker branch scans the ordered players for the Demon
and its nearest Minion, measures the circular seat distance and builds the
possible numbers; the Oracle branch counts the dead evil players the same way.
The role modules declare their steps and nothing else.

ADR 0002 slice 5 moves the answer values of the information roles onto the
`information` capability, which the Trouble Brewing information roles already
use. Clockmaker and Oracle are the first two roles of that slice: each is a
number read from the current seats, with no registration, pairing or ledger
fact and no command-version guard. The remaining Sects & Violets roles need a
new fact or decision shape and stay out of this change.

## What changes

- The information context gains one read-only fact: `isAlive(playerId)`.
  `seatIds` already lists every seat, alive or dead; the Oracle needs to know
  which of them have died. `informationFacts` supplies it from the current
  roster.
- The Clockmaker declares an `information` capability with `infoKind:
  "clockmaker"`. It answers the circular seat distance from the Demon to the
  nearest Minion in play, alive or dead, and names every number from 0 to the
  seat count as possible.
- The Oracle declares an `information` capability with `infoKind: "oracle"`.
  It answers the number of dead evil players and names every number from 0 to
  the seat count as possible.
- `svInfoForStep` keeps the presentation and the shared mechanisms: the
  impairment flag, `vortoxFalsifies`, the options derived from `possible`
  (the true value removed under a living, unimpaired Vortox), the suffixes,
  `textKey`, `textVars`, the stored Russian fallback and the answer shape.
  Only the counting comes from the role now.
- The fact builders `registrationApplies`, `alignmentOf`, `registersAs*`,
  `characterChoices`, `executedOn` and `informationFacts` move to
  `src/core/engine/information-facts.ts`. `information.ts` imports and
  re-exports them, so its public imports do not change, and `sv.ts` imports
  only `informationFacts` without closing an import cycle.
- `scripts/role-ownership.ts` reads the new coordinator file, so the Recluse
  and Spy registration references stay in the ledger.
- `docs/role-ownership.md`: the Clockmaker and Oracle rows declare
  `capability:information` and keep `sv.ts` as the presentation reference.

## Impact

Behavior is unchanged. The count, the possible range (0 to the seat count
inclusive), the stored `given` record and its key order, the text and
`textVars`, the impairment and Vortox suffixes, the host question, the journal
case, the error for an answer that was not offered, the log lines, the command
events and the port draws stay the same, so saved games and journals replay as
before. No storage, command payload, schema or pin changes.

The other five Sects & Violets information roles are not part of this change.

# The Flowergirl and Town Crier as information capabilities

Issue: #211

## Why

The Flowergirl's and Town Crier's yes-or-no answers are still computed in
`svInfoForStep`. One shared branch reads the ended-day ledger, checks
`voteCounts` for a partial external ledger, reduces the day's nominations to a
boolean and then applies the shared wrapper: the impairment flag, the
living-Vortox rule, the options, the suffixes, the text keys and the Russian
text. The role modules declare their step and nothing else.

ADR 0002 slice 5 moves the answer values of the information roles onto the
`information` capability, which the Trouble Brewing information roles already
use. The Flowergirl and Town Crier complete that slice for the boolean roles:
each is one recorded fact of the day that just ended, with no decision-shape
change, no registration dependence and no command-version guard.

## What changes

- The information context gains one read-only, nullable fact: `votesToday`,
  with `demonVoted` and `minionNominated`. It is null when there is no complete
  ended-day ledger.
- `votesOn(state, dayNumber)` moves the `lastDayFor` shape check and the
  nomination reduction into `src/core/engine/information-facts.ts`.
  `informationFacts` supplies `votesToday: votesOn(state, query.at.number - 1)`.
  The vote-time snapshots (`demonVoters`, `minionNomination`) are read first,
  with the current roles of `votes` and `nominatorId` as the legacy fallback,
  exactly as the engine branch did.
- The Flowergirl declares an `information` capability with `infoKind:
  "flowergirl"`; it answers `votesToday.demonVoted`.
- The Town Crier declares an `information` capability with `infoKind:
  "towncrier"`; it answers `votesToday.minionNominated`.
- Both return `{ kind: "answer", value: boolean, possible: [true, false] }` in
  that order and read neither `impaired` nor a Vortox.
- `svInfoForStep` keeps the no-day record, the impairment and Vortox wrapper,
  the options filter, the text keys and text, the host-choice case, the journal
  case and the stored answer shape. `lastDayFor` is deleted because `votesOn`
  carries the shape check.

## Impact

Behavior is unchanged. The value, the stored `given` record and its key order,
the text keys and the Russian text, the impairment and Vortox suffixes, the
host question, the journal case, the error for an answer that was not offered,
the log lines, the command events and the port draws stay the same, so saved
games and journals replay as before. No storage, command payload, schema or pin
changes.

The Dreamer and the Evil Twin are not part of this change.

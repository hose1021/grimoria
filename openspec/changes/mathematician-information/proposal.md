# The Mathematician as an information capability

Issue: #211

## Why

The Mathematician's count is still computed in `svInfoForStep`. The branch calls
`abnormalCount(state)`, builds the possible numbers from the seat count and
then applies the shared wrapper: the impairment flag, the living-Vortox rule,
the options, the suffixes, the text key, the text variables and the stored
record. The role module declares its step and nothing else.

ADR 0002 slice 5 moves the answer values of the information roles onto the
`information` capability, which the Trouble Brewing information roles already
use. The Mathematician is the fourth role of that slice and reuses the shape
the Clockmaker and Oracle proved: a number plus every value up to the seat
count. It needs one additive read-only fact — the number of distinct marked
players — and no new decision arm, version gate or record shape.

## What changes

- The information context gains one read-only fact: `abnormalCount: number`,
  the number of distinct players carrying an ABNORMAL reminder since the last
  Mathematician wake. The reasons are never exposed, and a duplicate mark for
  one player counts once.
- `abnormalCount(state)` moves from `sv.ts` to
  `src/core/engine/information-facts.ts`, where `informationFacts` supplies the
  fact. `sv.ts` re-exports the imported binding, so `engine/index.ts` and its
  callers keep importing it from the same place. The fact builder does not
  import `sv.ts`, so no cycle is created.
- The Mathematician declares an `information` capability with `infoKind:
  "mathematician"`. It answers the `abnormalCount` fact and names every number
  from 0 to the seat count as possible. It does not read `impaired` and does
  not read a Vortox.
- The Mathematician branch of `svInfoForStep` calls
  `resolveInformationCapability(roleModule("mathematician"), informationFacts(
  ...))` and keeps the shared wrapper: options derived from `possible`, the
  true value removed only under a living, unimpaired Vortox, the suffixes,
  `textKey`, the stored Russian `text` and the answer shape.
- `completeSvStep` keeps the ABNORMAL-ledger clear; a resolver is pure and
  cannot mutate. `validateGiven`, `givenIsLegal` and `caseForStep` are
  untouched, so an impaired or Vortox answer stays `false-information`.

## Impact

Behavior is unchanged. The count, the possible range (0 to the seat count
inclusive), the stored `given` record and its key order, the text, the
impairment and Vortox suffixes, the host question, the journal case, the error
for an answer that was not offered, the log lines, the command events and the
port draws stay the same, so saved games and journals replay as before. No
storage, command payload, schema or pin changes.

The Dreamer, Evil Twin, Flowergirl and Town Crier are not part of this change.

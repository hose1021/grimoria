# Proposal

Issue: #34
Parent: #19, stage 2

## Why

`docs/rules-matrix.md` still lists several Trouble Brewing mechanics as
`implemented-unverified`: the Librarian, Investigator, Spy grimoire and
registration, the Recluse's dead and Minion/Demon registration, the Saint under
impairment, nomination limits, the official TB night order, and false
information for an impaired information role. The engine code exists for these
paths but no test proves the behavior, so the audit table cannot claim them.

## What Changes

- Add behavioral tests for the Librarian and Investigator one-of-two
  information, including the Librarian "zero" result.
- Add tests for every Trouble Brewing information role's false-information
  override while drunk or poisoned, including the Librarian whose setup result
  is zero.
- Add Spy grimoire and Spy/Recluse registration tests for dead players and for
  good, evil, Townsfolk, Outsider, Minion and Demon queries.
- Fix the Recluse registration so that registering merely as evil does not
  count as registering as a Demon.
- Fix the impaired Librarian zero path so the step still offers allowed false
  information instead of claiming that zero are in play.
- Add a Saint-under-impairment test.
- Add the official Trouble Brewing first-night and other-night order test.
- Add nomination-limit tests for the nominator, the nominee and a dead
  nominator.
- Add one end-to-end Trouble Brewing game test at every player count from five
  to fifteen.
- Mark the closed rows `verified` in `docs/rules-matrix.md`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game/trouble-brewing`: adds the verified information, registration, Saint,
  night-order, nomination-limit and end-to-end scenarios.

## Impact

- Runtime: `src/core/engine/information.ts`.
- Tests: `js/engine.test.mjs`.
- Docs: `docs/rules-matrix.md`.
- No schema change, migration or new dependency.

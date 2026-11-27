# Proposal

Issue: #200

This is a bounded follow-up to the table foundation and the local
`review-regressions` fixes; it does not close the umbrella issue.

## Why

Selecting the Lunatic before the Demon can leave the wrong default mask.
The player bubble has no quick vote tally or dead-vote marker, and setup has
no bluff shuffle or separate Lunatic bluff selection.

## What Changes

- Follow the selected Demon by default, with an explicit setup mask override
  and a way to resume following.
- Offer separate Demon and Lunatic bluff choices and a host-clicked shuffle
  for each. Demon choices are free good characters; Lunatic choices may be
  in play.
- Record aggregate votes and dead-vote use from the player bubble without
  inventing nomination or voter identities or triggering executions.
- Keep incomplete voting records from producing fabricated Flowergirl or
  Town Crier answers.
- Add core, persistence, replay and browser regressions while retaining
  Lunatic privacy and Fortune Teller self-target coverage.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game/setup`: default and explicit Lunatic masks, separate bluff pools.
- `game/day-and-win`: manual tallies and dead-token bookkeeping.
- `game/sects-and-violets`: host answers for incomplete manual vote records.
- `app/table-console`: bubble voting controls and setup shuffle controls.

## Impact

Core commands, optional backward-compatible v4 fields, saved bag metadata,
setup/table UI, three locales and tests. No new dependency, storage key,
schema-version change, rule pin or deployment.

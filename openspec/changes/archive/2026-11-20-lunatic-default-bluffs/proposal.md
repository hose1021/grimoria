# Proposal

Issue: #256

## Why

New games and suggested bags store an empty Lunatic bluff list. Nullish-only
fallback treats that empty list as an override, leaving the first-night
instructions and player card without the host's selected Demon bluffs.

## What Changes

- Use the Demon bluff list when the separate Lunatic list is missing or empty.
- Apply that default consistently in setup, first-night instructions and the
  private player card.
- Preserve nonempty separate selections, including partial setup drafts.
- Add engine and real-browser regressions for the default and overrides.
- Preserve old journal behavior through the existing command-version contract.

## Capabilities

### Modified Capabilities

- `game/setup`: unchosen Lunatic bluffs follow the Demon list.
- `app/table-console`: the private Lunatic card displays the same default.

## Impact

Setup and information fallback, plus a new command ruleset version that keeps
the previous version replayable. No stored fields, schema version, dependency,
rules pin or arbitrary Storyteller choice is added.

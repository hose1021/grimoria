# Proposal

Issue: #29
Parent: #19, stage 1b

## Why

Event and trigger handling still differs per script. Trouble Brewing inserts the
Ravenkeeper by its official slot, while Bad Moon Rising appends the
Grandmother and Sects & Violets appends the Sweetheart, Barber and Sage in
code order. Two deaths recorded in a different order therefore produce a
different wake order, and a cascade resolved by hand has no single documented
priority or typed cycle error.

## What Changes

- Add one frozen `EVENT_PRIORITY` list shared by Trouble Brewing, Bad Moon
  Rising and Sects & Violets, ordered death, on-death, delayed,
  conditional-wake, impairment, win.
- Add `orderCascade`, one cascade resolver that honours declared `after` edges,
  breaks ties by the shared priority and then the key, resolves an A→B→C chain
  in one call, and returns the typed `CYCLIC_CASCADE` error with the
  unresolvable keys without mutating its input.
- Reuse `orderCascade` for the poison/drunk effect graph instead of a second
  topological sort, keeping `CYCLIC_EFFECT_DEPENDENCY` for that graph.
- Insert death-triggered and conditional night steps by their official
  `nightsheet.json` slot through the shared `insertStepInto`, so the order the
  deaths are recorded in never changes the queue.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game/command-engine`: adds the shared event priority, the cascade resolver
  with its typed cycle error, and the deterministic death-triggered wake order.

## Impact

- Runtime: `src/core/model/effect-graph.ts`, `src/core/engine/sv.ts`,
  `src/core/engine/bmr.ts`.
- Tests: `js/commands.test.mjs`, `js/snv.test.mjs`.
- No schema change, migration or new dependency.

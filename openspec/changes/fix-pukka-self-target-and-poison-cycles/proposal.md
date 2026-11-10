# Proposal

Issue: #19
Review: https://github.com/hose1021/pocket-grimoire-go/pull/24#issuecomment-6764787575

## Why

PR #24 made the Pukka's poison and delayed death engine-owned, but review found
two edge cases: a self-target can suspend the previous death instead of
resolving it, and cyclic poison effects can recurse until the call stack
overflows. The engine must produce the documented Pukka outcome and return a
typed rejection for a cycle, not crash or invent a rule.

## What Changes

- Implement the documented Pukka × Pukka self-target outcome:
  - the Pukka becomes poisoned;
  - the previous victim becomes healthy and survives that night;
  - the previous death stays suspended;
  - a healthy Pukka later resolves the suspended death, and dies itself as the
    previously poisoned target when it makes another choice.
- Resolve poison and drunk activity through one dependency graph, independent
  of the order of `state.effects`.
- Enforce effect start and expiry boundaries, suspend effects from a poisoned
  or drunk source, handle simultaneous poison/drunk, and resume a Pukka's
  ability only after the last impairment ends.
- Detect a genuinely unresolvable poison or drunk dependency cycle and return
  `CYCLIC_EFFECT_DEPENDENCY` from command validation, preview, apply and import.
- Reject an imported or saved game with such a cycle without changing the
  current game or overwriting the stored save.
- Keep old saves compatible: the new effect metadata is optional.
- Add RED → GREEN tests for self-target transitions, game-over, preview/apply
  parity, valid sequential mutual poisoning, invalid cyclic states and import.
- Update `docs/rules-matrix.md`, `docs/rules-sources.md` and the generated
  service worker after the runtime change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game/bad-moon-rising`: adds the Pukka self-target, suspension, immediate
  resolution and self-death requirements.
- `game/command-engine`: adds deterministic poison dependency resolution and
  the `CYCLIC_EFFECT_DEPENDENCY` rejection contract.
- `game/state-and-storage`: adds rejection of imported games whose effect graph
  contains an unresolvable cycle.

## Impact

- Runtime: `js/engine/bmr.js`, `js/engine/effects.js`,
  `js/engine/commands.js`, `js/model.js` and a shared effect-graph helper;
  `js/store.js` passes the import rejection through.
- Tests: `js/bmr.test.mjs`, `js/commands.test.mjs`, `js/store.test.mjs`.
- Docs and offline asset: `docs/rules-matrix.md`, `docs/rules-sources.md`,
  `sw.js`.
- No new dependency, API version bump or branch change. Work stays on the
  existing PR #24 branch; no merge is performed.

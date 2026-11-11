# Proposal

Issue: #32

## Why

Issue #32 (parent #19, section "Инварианты") asks for the five state invariants
to become executable tests. The command engine already checks some of them on a
draft, but the checks were not exercised as a group and one family of references
was missing: nominations, morning deaths, the day execution, the Butler's master,
the Mastermind record and the setup player references were never verified, so a
corrupted or imported state could keep a dangling player reference.

## What Changes

- Add `js/invariants.test.mjs` with one behavioural test per invariant:
  1. exactly one in-script character per player, one alignment, and no rule
     record pointing at a missing player;
  2. once-per-game abilities stay spent without legal restoration, and dead
     players do not wake without a rule exception;
  3. an effect follows the rule of its own role when its source ends;
  4. no final win is declared before mandatory immediate effects and Demon
     replacements resolve;
  5. replaying the recorded command/event journal reproduces the state, undo
     plus replay stays consistent, and a repeated command does not double a
     death or stack an effect.
- Complete `checkInvariants` with the missing player-reference checks, with the
  RED test as evidence.
- Record RED and GREEN evidence in `tasks.md`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game/command-engine`: adds the executable state invariants and the missing
  reference checks.

## Impact

- Runtime: `src/core/engine/commands.ts` (`checkInvariants` only; `setOrder` and
  the effect graph are untouched).
- Tests: new `js/invariants.test.mjs`.
- No dependency, save-format, API or schema change.

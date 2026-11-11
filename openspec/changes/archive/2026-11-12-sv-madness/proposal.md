# Proposal

Issue: #40

## Why

Sects and Violets madness exists only as a step note. The Cerenovus step stores
a target and a good character, and the Mutant row is `unsupported`, but the
engine does not remember that a player must be mad, for how long, or which
character. The Storyteller has no legal control to record the "might be
executed" penalty, so the app cannot explain or audit the decision, and a
future screen could leak the requirement into a public view.

## What Changes

- Model madness as a stored effect with a source (`cerenovus` or `mutant`), the
  target player, the character (or Outsider status) they must be mad about, and
  an expiry. The Cerenovus creates it at the night step for the next day; the
  Mutant's standing requirement is reconciled from its character holder.
- Add the `madnessPenalty` command. Its legal options are `execute` and `none`,
  it requires a non-empty Storyteller reason, records the decision on the token
  and in the secret log, and executes only through the normal day execution
  path. The engine never decides for the Storyteller.
- Keep the current views closed: `publicGameView` and the player handoff expose
  no madness data, and a test asserts it.
- Prove with RED → GREEN tests: the Cerenovus duration and expiry, the removal
  of a token, the execution and declined penalties with their legal options, the
  Mutant requirement, and the public projection.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game/sects-and-violets`: adds the madness state, its expiry and the
  Storyteller penalty command for the Cerenovus and the Mutant.

## Impact

- Runtime: `src/core/engine/sv.ts` (madness effects, reconciliation, penalty),
  `src/core/engine/effects.ts` (a Cerenovus token survives its source),
  `src/core/engine/day.ts` (execution cause), `src/core/engine/commands.ts`
  (command handler), `src/core/commands/contracts.ts` and
  `src/core/model/types.ts` (command surface), `src/core/engine/index.ts`
  (public API).
- Tests: `js/snv.test.mjs`.
- `docs/rules-matrix.md`: the Cerenovus and Mutant rows only.
- The game schema stays v4; effects are already part of it, so no migration and
  no new dependency.

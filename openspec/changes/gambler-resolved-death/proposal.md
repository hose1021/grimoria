# Proposal

Issue: #218

## Why

Gambler r3073: "Each night*, choose a player & guess their character: if you
guess wrong, **you** die." The role module already resolves the Gambler's death
through the shared ability path.

The step nevertheless declared `canKill: true`, so the console offered a death
control for the chosen targets, and `recordBmrOutcome` accepted any death among
them. A Storyteller could kill the guessed player, which the pinned text does
not allow.

## What Changes

- The Gambler step declares `canKill: false`; the console no longer offers a
  death control for it.
- `recordBmrOutcome` rejects any recorded death on a step that the engine
  resolves, with the existing `error.51` family.
- One new test proves the guessed player cannot be killed through the outcome
  path while the wrong-guess self-death still works.

## Out of Scope

- The existing wrong-guess, correct-guess, impairment and dead-target behavior.
- Any other Bad Moon Rising step's death controls.

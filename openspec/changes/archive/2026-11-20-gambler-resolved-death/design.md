# Design

## Context

`RoleModule.nightStep.canKill` controls the console death control and is stored
on the built `NightStep`. `recordBmrOutcome` validated a recorded death against
the step's chosen targets and maximum count, but not against `canKill`.

The Gambler's ability returns a `kill` intent for the actor and the engine
applies it through `kill()`. The Guessed player is never a death target. The
same pattern already exists for the Pukka, whose test asserts `canKill: false`
because the engine resolves its death.

## Decision

- `src/core/roles/gambler/role.ts`: `canKill: false`.
- `src/core/engine/bmr.ts`: when `deathIds` is not empty and the step does not
  declare `canKill`, reject with `error.51`. The Tinker keeps its explicit
  exception because the Storyteller decides its death.
- No engine path records a death through `recordBmrOutcome` for a step whose
  death the engine already applies.

## Risks / Trade-offs

- A role that needs both an engine-resolved death and a host-recorded second
  death would need a new flag. No supported role does; the Shabaloth records
  its two kills itself, and the Gambler has one death.
- The rejection uses the existing `error.51` code and message family, so no
  translation key changes.

## Test plan

- `bmr.test.ts`: after a correct guess, `recordBmrOutcome` with the guessed
  player's id is rejected and that player stays alive.
- Existing wrong-guess, correct-guess, impairment and dead-target tests stay
  green.
- Full `npm test`, `npm run typecheck`, acceptance and OpenSpec checks.

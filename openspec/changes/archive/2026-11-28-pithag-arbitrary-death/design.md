# Design

## Context

`RoleModule.nightStep.canKill` controls the console death control and is stored
on the built `NightStep`. `sv.ts` already set `step.canKill = true` after
`replaceCharacter` when the new character's team is `demon`, but the module
declared the flag at build time, so the fresh step also offered it.

`recordSvOutcome` is the only host-death writer for Sects & Violets; it checked
the Demon's impairment and the Vigormortis neighbour but never `canKill`.
`recordBmrOutcome` already rejects a death on a step without the flag, so the
two editions disagreed.

## Decision

- `src/core/roles/pithag/role.ts`: drop `canKill` from the step spec. The
  completion keeps setting it when a Demon is created.
- `src/core/engine/sv.ts`: when `deathIds` is not empty and the step does not
  declare `canKill`, reject with `error.51`.
- `src/core/engine/command-versions.ts`: pin the last open version
  (`tb-bmr-snv-2026-11-17.3`), bump `RULESET_VERSION` to `…-17.4`, and let a
  Pit-Hag death recorded under an earlier version pass. All supported Demon
  steps always declare `canKill`, so the exception covers only the legacy
  Pit-Hag route.

## Risks / Trade-offs

- An old save whose Pit-Hag step already carries `canKill: true` keeps it; the
  saved flag is the recorded affordance. New games build the corrected step.
- A host who marks deaths on another Sects & Violets information step now gets
  a rejection instead of a silent kill. No legal path used that route: the
  console gated every death panel on `canKill` except the Pit-Hag step.
- The rejection reuses the existing `error.51` code and message, so no
  translation key changes.

## Test plan

- `snv.test.ts`: a fresh Pit-Hag step has `canKill: false`; choosing a
  character already in play keeps it false and `recordSvOutcome` returns
  `error.51` with the player alive.
- `snv.test.ts`: the same death under `OPEN_PITHAG_STEP_RULESET_VERSION` is
  accepted, so a recorded journal replays as written.
- `roles/pithag/role.test.ts` and the queue snapshot either omit or expect
  `canKill: false`.
- Full `npm test`, `npm run verify`, acceptance and OpenSpec checks on Node 24.

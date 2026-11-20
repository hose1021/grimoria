# Design

## Context

`src/core/engine/becoming.ts` sets `state.night.demonChanged = true`, and
`appendConditionalSteps` in `src/core/engine/night.ts` inserts the
`demonchange` step when that flag is set. The night paths call
`appendConditionalSteps` from `finishStep`, so a night self-kill queues the
step immediately.

`endDay` in `src/core/engine/day.ts` builds the next night with
`demonChanged: false`, and `startNight` also clears the flag before building
the queue. A daytime succession therefore lost the wake-up instruction.

## Decision

`endDay` captures `state.night.demonChanged` before it replaces the night
object, writes the captured value into the new night, builds the queue, and,
when the flag was set, calls `appendConditionalSteps` and clears the flag. The
step is then part of the persisted night queue and survives a reload.

Do not change `startNight`: a queue that already contains the `demonchange`
step returns early as a resume. A reload before `endDay` keeps the flag in the
saved state, so `endDay` still sees it.

## Risks / Trade-offs

- `appendConditionalSteps` may also add death-triggered steps at the same point.
  Those steps belong to the same new night and are idempotent for an existing
  key, so the call adds no duplicate.
- The flag is cleared after insertion. The `demonchange` step itself proves the
  wake-up was scheduled; a repeated `endDay` cannot run because the phase has
  already moved to night.

## Test plan

- `engine.test.ts`: execute the Demon during the day with five players and a
  sober Scarlet Woman, end the day, assert the next queue contains a
  `demonchange` step and that it completes.
- Existing night self-kill, below-threshold and registration tests stay green.
- Full `npm test`, `npm run typecheck`, `node scripts/check-acceptance.mjs`,
  `node scripts/openspec-check.mjs`.

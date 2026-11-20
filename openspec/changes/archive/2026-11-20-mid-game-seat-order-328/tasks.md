# Tasks

## Evidence

- RED: `node --test --test-name-pattern="F-017" scripts/verification/findings.test.ts` failed with `actual: null, expected: null` on "setOrder during a live day must be rejected".
- GREEN: the same command passes after the policy change.
- `node --test src/core/engine/lifecycle.test.ts`: 15 pass, including the day and night refusals with unchanged state.
- RED: replaying a fixture generated at `c75e381` with two mid-game `setOrder` entries failed: `Запись журнала «legacy-seat-11» не воспроизводится: Игра уже началась.`
- GREEN: `a journal recorded during a mid-game seat reorder replays and keeps its order (SYS-LIFECYCLE-02)` and `a game saved after a mid-game seat reorder keeps that order through replay and undo (SYS-LIFECYCLE-02)` pass; the same journal replays to the saved state and the store undo restores the recorded order.
- `PG_BROWSER_CHECK=seat-lock node scripts/browser-check.ts`: PASS.

## Work

- [x] Restrict `setOrder` to `setup`, `deal` and `seat`.
- [x] Keep the old policy for journal entries recorded before `tb-bmr-snv-2026-11-20`.
- [x] Add the old-dev journal fixture and the engine replay and store undo tests.
- [x] Render a locked `/seat` outside those phases.
- [x] Translate the locked state for ru and az.
- [x] Replace the "correction stays available" lifecycle test with the refusal.
- [x] Add the `seat-lock` browser case.
- [x] Write the lifecycle and ui-shell deltas.

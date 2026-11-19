# Tasks

## Evidence

- RED: `node --test --test-name-pattern="F-017" scripts/verification/findings.test.ts` failed with `actual: null, expected: null` on "setOrder during a live day must be rejected".
- GREEN: the same command passes after the policy change.
- `node --test src/core/engine/lifecycle.test.ts`: 15 pass, including the day and night refusals with unchanged state.
- `PG_BROWSER_CHECK=seat-lock node scripts/browser-check.ts`: PASS.

## Work

- [x] Restrict `setOrder` to `setup`, `deal` and `seat`.
- [x] Render a locked `/seat` outside those phases.
- [x] Translate the locked state for ru and az.
- [x] Replace the "correction stays available" lifecycle test with the refusal.
- [x] Add the `seat-lock` browser case.
- [x] Write the lifecycle and ui-shell deltas.

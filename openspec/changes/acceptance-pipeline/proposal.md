# Proposal

Issue: #46

## Why

Issue #46 (Этап 5: CI-приёмка, fuzz/replay/E2E и финальный отчёт; parent
#19) asks for a full pipeline acceptance test. This change is the pipeline
slice of #46: a game created from the zero state must reach the finale by the
same actions a Storyteller uses, without editing the state and without touching
a screen.

The command engine had every individual action, but no single host action took
a prepared bag into night 1: the setup screen had to compose `dealGame`,
`setOrder`, `autoSecrets` and `startNight` in order. Nothing proved that the
composition reaches a finale, so a regression in one transition could break the
whole game without failing a test.

## What Changes

- Add the `startGame` command: deal the prepared bag (optionally with an
  explicit assignment), seal the seat order, fill the setup secrets that need no
  host decision, and start night 1 in one validated command. A host-only secret
  (the Drunk's false information) still blocks the start and is recorded with
  `setSetupInfo` before retrying.
- Add `js/acceptance.test.mjs` with two tests:
  - one fixed five-player Trouble Brewing game that goes from a prepared bag to
    a finale through the command flow only;
  - one seeded sample of 33 Trouble Brewing games (player counts 5-15, three
    seeds per count) with the same path, plus a determinism check for one seed.
- Every test command is validated before it is applied, target sets and false
  information come from the engine's own options, and the journal must explain
  every phase, night step, nomination, vote, execution and the finale.
- Record the RED and GREEN evidence in `tasks.md`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game/command-engine`: adds the `startGame` host action and the zero-step
  acceptance requirement that a prepared game reaches a finale through the
  command surface.

## Impact

- Runtime: `src/core/engine/commands.ts` (`startGame`), the command contract
  (`src/core/commands/contracts.ts`, `src/core/model/types.ts`) and the public
  API (`src/core/engine/index.ts`).
- Tests: new `js/acceptance.test.mjs`.
- No dependency, save-format or schema change; no screen change.

# Proposal

Issue: #215

Epic: #200

## Why

Lifecycle guards are duplicated and incomplete. The engine repeats the
"game is over" preamble at 21 sites and the "not daytime" preamble at 15 sites,
while `endNight` and `dealGame` have no phase guard and `bagUpdate` accepts any
phase in its patch. A stale tab or a direct engine call can therefore rebuild
the day, re-deal a running game, or move the machine outside the documented
setup -> deal -> seat -> night <-> day -> over path.

The same gap exists for scripts: a single-edition custom script may carry
`manualOnly: true`, which silently disables the automatic night queue and win
checks even though `SPEC.md` reserves manual mode for mixed-edition pools.

## What Changes

- Add one lifecycle policy module that declares every command's allowed phases
  and one guard helper used by the command handlers.
- Keep the documented transition owners: `dealGame`, `claimSeat`/`startGame`,
  `startNight`, `endNight`, `endDay`, `setWinner`, plus the explicit
  `manualCorrection` escape that clears an over state.
- Add the missing guards: `endNight` requires night, `dealGame` requires a
  setup/deal/seat phase, and a `bagUpdate` phase patch may only reset to setup.
- **BREAKING**: reject `manualOnly: true` on a single-edition custom script at
  import; migrate a legacy saved flag to the automatic engine on load.
- Add focused tests for every transition, for the atomic rejection of a
  wrong-phase command, and for the manual-only boundary.
- Record the app contract as `SYS-LIFECYCLE-01/02` and `SYS-SCRIPTS-10` with
  the exact asserting tests.

## Capabilities

### New Capabilities

- `game/lifecycle`: the phase set, the transition owners, the per-command phase
  policy and the rule that a phase rejection changes no state.

### Modified Capabilities

- `game/custom-scripts`: manual-only mode is legal only for a pool that mixes
  editions; a same-edition script always uses its matching engine.

## Out of Scope

- Role rules, win reasons, night order and pin changes.
- Jinx resolution: the versioned jinx boundary is already audited as
  `SYS-SCRIPTS-08` and stays unchanged.
- A new state machine library, a schema version, a storage key, a command
  payload or a journal format change.

## Impact

Engine handlers in `setup-commands.ts`, `setup.ts`, `night.ts`, `day.ts`,
`death.ts`, `bmr.ts` and `sv.ts`; the script normalization and state validation
in `src/core/model/state.ts`; three locale catalogs for one new error code;
`SPEC.md`, `docs/adr/0002-engine-contracts.md`, `docs/rules-shared.md` and
`docs/rules-matrix.md`. No schema, storage key, command payload, rules pin or
UI contract changes.

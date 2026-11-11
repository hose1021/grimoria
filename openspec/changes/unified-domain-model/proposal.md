# Proposal

Issue: #28
Part of #19.

## Why

The state model grew feature by feature. Nothing records which game notion
lives in which field, so a mechanic can quietly add a second source of truth or
read a derived value as if it were stored. The save validator guards a source
and a target of an effect but not the interval that makes timing rules
(persistent poison, tonight-only protection, until-dusk drunk) work, so a
malformed or hand-edited save can reach the engine with an undated effect.

## What Changes

- Audit every listed notion against `src/core/model/state.ts`: player,
  character and team, life and death, registered death, the Drunk and Lunatic
  masks, ability health, drunk and poison with a source and an interval,
  protections and immunities, temporary effects, reminders, used abilities,
  Storyteller choices, day and night, step order and win candidates.
- Record the result in `design.md` as `notion -> state field -> test` or
  `notion -> derived, not stored` with the reason.
- `validateState` rejects an effect without a source, without a target, without
  an interval, and with a malformed `start` or `expires` cycle.
- No new state field: the audit found every notion already stored or
  explicitly derived, so the schema stays at v4 and no migration is added. A
  v3 save with an effect is covered by a regression test.
- No **BREAKING** change: the saved shape, exports and command payloads are
  unchanged; the validator only rejects effects the engine could not date.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `game/state-and-storage`: the domain-model coverage table becomes a
  maintained requirement, and an effect now needs a source, a target and an
  interval to pass validation.

## Impact

- Code: `src/core/model/state.ts` (effect validation and a shared phase list).
- Tests: new `src/core/model/state.test.ts`; the existing store, script and
  engine suites keep proving that saved and migrated games load.
- Docs: `openspec/changes/unified-domain-model/design.md` carries the audit
  table. No role, mechanic or UI change.

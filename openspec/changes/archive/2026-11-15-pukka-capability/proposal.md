# Proposal

Issue: #200

## Why

ADR 0001 and the `role-capability-contract` change proved the resolver shape on
the Gambler. The next slice named there is the Pukka: a delayed poison, a
previous victim and the impairment suspension. The current Pukka rule still
lives in `completeBmrStep` and reaches effect internals directly, so the
capability contract cannot yet carry it honestly.

## What Changes

- Extend `AbilityContext` with the night number and the pending deaths owned by
  the actor.
- Extend `RoleEffect` with the shared mechanics a delayed poison needs:
  `poison`, `delay-death`, `suspend-death`, `release-poisons` and
  `resolve-death`.
- Extend `AbilityDecision` so a resolver may supply a rule note and a step
  result, and so `suppressed` may suspend pending deaths instead of only
  writing the generic note.
- Move the Pukka effect helpers out of `bmr.ts` into `engine/pukka.ts`, shared
  by the coordinator and the remaining Exorcist/outcome paths.
- Move the Pukka resolution from `completeBmrStep` into
  `src/core/roles/pukka/role.ts`; delete the edition branch.
- Keep every effect id, field and step result unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game/role-modules`: the capability contract gains the delayed-effect
  intents and the Pukka resolver.

## Impact

- `src/core/roles/ability.ts`, `src/core/roles/pukka/role.ts`,
  `src/core/engine/ability.ts`, `src/core/engine/pukka.ts`,
  `src/core/engine/bmr.ts`, `src/core/engine/commands.ts`.
- Tests: the existing seven BMR Pukka rules, the Exorcist Pukka paths, the
  Gambler resolver fixture and new pure Pukka resolver tests.
- No command, storage, UI, schema or pinned-rule change.

# Proposal

Issue: #200

## Why

Issue #200 asks for a second-stage role architecture in which a role owns its
rules and the engine owns execution. Stage one (#177) gave every supported role a
module with a night step and a death hook, but the resolution of a completed step
is still a role literal inside `src/core/engine/bmr.ts`, `src/core/engine/sv.ts`
and `src/core/engine/night.ts`. The Gambler rule therefore lives in two places:
its module knows that it wakes on other nights and targets any player, while
`bmr.ts` knows what a wrong guess does.

That split has no contract. A role branch can call any private engine helper,
write unrelated state or duplicate a shared invariant, and nothing in the type
system says otherwise. The registry proves presence, not ownership.

Pilot the contract on one simple active ability before any large migration. The
Gambler is the smallest role that resolves a host-chosen target and a
host-answered character into a consequence: "Each night*, choose a player &
guess their character: if you guess wrong, you die" (`Gambler` r3073).

## What Changes

- Add `src/core/roles/ability.ts`: a read-only `AbilityContext`, typed
  `RoleEffect` intents and a discriminated `AbilityDecision` (`effects`,
  `suppressed`, `no-effect`).
- Add `ability?: RoleAbility` to `RoleModule`, so a role declares its resolution
  beside its night step and death hook.
- Move the Gambler's resolution from `src/core/engine/bmr.ts` to
  `src/core/roles/gambler/role.ts`. A wrong guess returns one `kill` intent for
  the actor; a correct guess returns no effect; an impaired Gambler returns
  `suppressed`.
- Add `src/core/engine/ability.ts`, the one coordinator: it builds the context,
  calls the resolver and applies the intents through the existing `kill()` path.
- Move `setStepNote` from `night.ts` to `context.ts` so the coordinator does not
  import the night queue module, and update its three importers.
- Record the decision in `docs/adr/0001-role-capability-contract.md` and update
  the module descriptions in `AGENTS.md`, `docs/rules-sources.md`,
  `docs/architecture.md` and the Gambler matrix row.
- Keep the contract and coordinator internal: no new public engine export, no
  command, payload, event, schema, storage or UI change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game/role-modules`: a role module may declare a resolvable ability, and the
  engine applies the returned intents through the shared death mechanic without
  changing any outcome.

## Impact

- `src/core/roles/ability.ts` (new): the capability contract types.
- `src/core/roles/types.ts`: `RoleModule.ability`.
- `src/core/roles/gambler/role.ts`: the Gambler resolution and its declaration.
- `src/core/roles/gambler/role.test.ts` (new): isolated resolver tests.
- `src/core/engine/ability.ts` (new): the intent coordinator.
- `src/core/engine/bmr.ts`: the Gambler branch is deleted; the module is
  dispatched once.
- `src/core/engine/context.ts`, `night.ts`, `sv.ts`: `setStepNote` moves to the
  step-helper module.
- `src/core/engine/bmr.test.ts`: characterization assertions for the death
  record and the dead-target rule; no expected outcome changes.
- `docs/rules-matrix.md`, `src/core/roles/gambler/rule.md`,
  `docs/adr/0001-role-capability-contract.md`, `AGENTS.md`,
  `docs/rules-sources.md`, `docs/architecture.md`.

## Out of Scope

- Any change to game behavior, a pinned revision, a command contract, the
  `pg.game.v4` schema, replay, privacy or the UI.
- Pukka, information, day, death, protection and transformation capabilities.
- Migrating the remaining role branches.
- A new dependency, event bus, second journal or generic state machine.

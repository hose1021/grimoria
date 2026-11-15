# Proposal

Issue: #209

Epic: #200

## Why

Epic #200 needs stable engine contracts before the remaining role branches move
in parallel. ADR 0001 and `role-capability-contract` proved one resolver shape
on the Gambler. `pukka-capability` added delayed effects. Neither covers the
other step kinds: a day action, a death trigger, an execution contribution,
information, registration and host adjudication, a transformation, or a win
contribution.

The current tree mixes ownership in four places:

- `src/core/engine/bmr.ts`, `src/core/engine/sv.ts` and
  `src/core/engine/night.ts` still hold role resolution.
- `src/core/engine/day.ts` holds day actions and the execution path.
- `src/core/engine/death.ts` holds succession, protection and every win reason.
- `src/core/roles/imp/role.ts` and `src/core/roles/sv-common.ts` import the
  engine. Nothing fails when another role module does the same.

The command path is atomic and deterministic, but the contract is implicit in
`src/core/engine/commands.ts`, `src/application/store/create-game-store.ts`,
`src/core/engine/execution.ts` and `src/core/model/state.ts`. A later slice can
break it without a visible rule.

This change records the stage-2 contract and adds one test. It changes no game
behavior, no command, no state field, no storage key and no UI.

## What Changes

- Add `docs/adr/0002-engine-contracts.md`: layer rules, the typed capability
  model for every step kind, one coordinator, the command transaction boundary,
  injected execution-context ports, the lifecycle policy, versioning and the
  migration order.
- Add `src/core/roles/architecture.test.ts`: fail on a new role-to-engine
  import and on a registry import outside `src/core/roles` and
  `src/core/model`.
- Add the `game/role-modules` delta for the step-kind capability contract and
  the role dependency direction.
- Add the `app/architecture-layers` delta for the coordinator, transaction,
  lifecycle and versioning contracts.
- Link ADR 0002 from `docs/architecture.md` and correct the one incomplete
  capability description there.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game/role-modules`: the module contract names the step-kind capabilities and
  the one-way dependency direction.
- `app/architecture-layers`: the engine coordinator, command transaction,
  lifecycle guards and versioning are explicit layer contracts.

## Impact

- `docs/adr/0002-engine-contracts.md` (new)
- `docs/architecture.md`
- `src/core/roles/architecture.test.ts` (new)
- `openspec/changes/engine-contracts/**` (new)

No engine, role, model, store, UI, script, package or dependency change.

## Out of Scope

- Any behavior change, rule change, pin change or test expectation change.
- Migrating the remaining role branches.
- A new state field, schema version, command, event, journal or storage key.
- An event bus, a second engine, a backend, XState or a new dependency.
- Reworking the command payloads or the UI.

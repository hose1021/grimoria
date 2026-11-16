# Design

## Context

Measured on `origin/main` at `5465e7e` (2026-11-15):

- `src/core/roles/types.ts` has `nightStep`, `firstNightStep`, `deathStep`,
  `onDeath` and `ability`. The Gambler and Pukka declare `ability`.
- The registry in `src/core/roles/registry.ts` is complete by type. It imports
  only `src/core/model/role-ids.ts`, `./types.ts` and role modules.
- `src/core/roles/imp/role.ts` imported `becomeDemon` and `isImpaired`.
- `src/core/roles/sv-common.ts` imported `nightAt` and
  `minionRetainsAbility`. Both imports are removed; the architecture test now
  fails on any role-to-engine import.
- `src/core/engine/commands.ts` already runs `validateCommand`,
  `previewCommand` and `applyCommand` on a clone. It rejects on an effect-graph
  cycle or an invariant violation. It records `state.applied` and one journal
  entry.
- `src/application/store/create-game-store.ts` owns prepare, dispatch, persist
  and publish. A failed save restores the pre-command clone.
- `src/core/engine/execution.ts` had one module-level active context and a
  `Math.random` fallback; `src/core/model/state.ts` had a module-level
  `clockOverride` used by `withClock`. Both are removed: one
  `CommandExecutionContext` is passed explicitly per command.
- `src/core/engine/death.ts` orders attack blocking, Mayor redirect, `kill`,
  Demon succession and `checkWin`. It already has one death path.
- `src/core/model/rules.ts` has `isManualScript`; `src/core/model/state.ts`
  rejects a mixed-edition script without `manualOnly`.

## Goals and Non-Goals

**Goals:**

- One document that names the capability for every step kind and the
  read-only facts each kind needs.
- One coordinator order that reuses `effects.ts`, `death.ts` and `retention.ts`.
- One command transaction boundary, with idempotency, fingerprint and version
  rules.
- One injection point for clock, random and id generation.
- One explicit lifecycle policy for normal, custom and manual-only scripts.
- One migration order with independently reviewable slices.
- One test that fails on a new role-to-engine import.

**Non-Goals:**

- Changing a game rule or the behavior of any command.
- Migrating a role in this change.
- Adding a type, field or export to the engine.
- A new dependency, event bus, second engine or state-machine library.

## Decisions

### The contract lives in ADR 0002

`docs/adr/0002-engine-contracts.md` owns the details. This design records the
implementation-facing shape and the proof.

- The capability union is `night-step`, `day-action`, `death-trigger`,
  `execution`, `information`, `adjudication`, `transformation` and `win`.
- Every context extends one read-only fact base. No context exposes
  `GameState`, a mutable `Player` or a mutable `Effect`.
- A capability returns a typed decision. The coordinator applies it through the
  existing shared mechanic.
- The existing legacy fields remain until the slice that moves their role.
  A role uses one path per behavior, never both.
- The transaction stays prepare -> validate -> draft -> invariants -> commit ->
  persist -> publish. `previewCommand` and a Storyteller choice return before
  commit.
- The expected version is the command `rulesetVersion` plus the saved schema
  version. This change adds no optimistic game-revision precondition.
- Clock, random and state ids are `CommandExecutionContext` ports. The record
  is created per command and passed to every domain function that stamps time
  or mints an id; `withClock`, `runWithExecutionContext` and `randomSuffix`
  are removed.
- The lifecycle stays a plain phase union with a guard in the function that
  changes the phase. No XState.
- A mixed-edition custom script stays `manualOnly`. A same-edition custom
  script uses the normal path.
- `pg.game.v4`, `SCHEMA_VERSION`, `RULESET_VERSION` and the journal fields do
  not change.

### The architecture test is the only new executable control

`src/core/roles/architecture.test.ts` scans every non-test `.ts` file under
`src/core/roles`:

1. It extracts static `from` specifiers, side-effect imports and literal
   dynamic imports.
2. It resolves each relative specifier from the file's directory.
3. It fails when the target is under `src/core/engine` and the file and
   specifier are not one of the four documented entries.
4. It fails when `registry.ts` imports a target outside `src/core/roles` and
   `src/core/model`.

The test uses `node:test`, `node:assert/strict`, `node:fs` and `node:path`. It
has no new dependency. It passes on the current tree.

The test is a textual scan. A runtime-assembled import can bypass it. Review is
the second control, as with `scripts/check-types-policy.mjs`.

### Proof of preservation

This change changes no behavior. The proof is:

- The architecture test fails when the exception map is empty, because the two
  documented files still import the engine. It passes with the map.
- `npm run typecheck` type-checks the new test in the test program.
- The existing engine, command, store, replay and invariant suites remain
  unchanged and pass.
- No `git diff` in `src/` except the new test file.

## Risks and Trade-offs

- The union describes arms that do not exist in code yet. The ADR states that
  an arm is added only with its first real role, so review can reject unused
  scaffolding.
- The exception map is a manual list. The test makes an addition visible; it
  does not prove the imports are correct. The ADR's removal plan is the review
  control.
- The test does not parse TypeScript. A false positive in a comment or a string
  is possible in a future file. The current roles tree has no such case.
- The ADR is long. It replaces several implicit conventions with one reviewable
  contract, which is cheaper than discovering them across eight slices.

## Migration

The ADR owns the order: slice 0 is this change; slice 1 removes the two
exceptions; slices 2-4 move the night steps; slice 5 moves information and host
choice; slice 6 moves death, execution and transformation; slice 7 moves win
contributions; slice 8 moves day actions; slice 9 injects the ports. Each slice
is one reviewable pull request and one OpenSpec change when it changes
behavior.

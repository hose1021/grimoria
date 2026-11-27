# Proposal

Issue: #212

Epic: #200

## Why

ADR 0002 and PR #254 fixed the one coordinator order on paper and implemented
the first capability slices, but no single acceptance suite proves that order
end to end across protection, death, execution, transformation and win. The
stages are still spread over `ability.ts`, `death.ts`, `day.ts`, `bmr.ts`,
`sv.ts` and `night.ts`, and the role ownership ledger still counts 61 roles as
engine branches. A later slice can move a check across a stage boundary or add
a second death/win path without failing a test, because the contract is only
described in the ADR.

## What Changes

- Add a source-backed cross-role acceptance suite for the coordinator: one
  fixture per stage boundary, each naming the pinned wiki revision it asserts.
- Add `game/command-engine` requirements for the fixed coordinator order,
  atomic multi-stage application and single ownership of the shared death,
  execution, transformation, effect and win writers.
- Add a `game/role-modules` requirement that a role module returns intents and
  never reimplements a shared mechanic.
- Add one executable ownership check: only the coordinator modules may call
  `kill`, `setWinner`, `replaceCharacter`, `swapCharacters` or `becomeDemon`,
  or write `state.effects` directly. The check replaces informal review for
  those writers.
- Fix only the defects the new tests expose. No coordinator rewrite, no role
  migration and no behavior change are planned; a failing case is fixed at its
  root in the shared function, not in the test.
- Record the exact commands, fixture names, pinned revisions and commit SHA in
  the task evidence.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game/command-engine`: the coordinated lethal resolution order, atomic
  application of every stage in one command, one owner for each shared writer,
  and the cross-role acceptance evidence are explicit requirements.
- `game/role-modules`: a role module returns typed intents through the
  coordinator and does not duplicate protection, death, execution,
  transformation, effect resolution or win logic.

## Impact

- Tests: new `src/core/engine/coordinator.test.ts`; extend
  `src/core/roles/architecture.test.ts` with the writer allowlist.
- Engine: `ability.ts`, `death.ts`, `day.ts`, `bmr.ts`, `sv.ts`, `night.ts`,
  `pukka.ts` and `src/core/model/effect-graph.ts` are inspected; only a defect
  found by the new tests is edited.
- Docs: `docs/adr/0002-engine-contracts.md` and `docs/role-ownership.md`
  reference the executable evidence.
- Unchanged: commands, payloads, state fields, `pg.game.v4`, error codes,
  winner reasons, journal and replay formats, UI, storage and dependencies.
- No new dependency. No game rule changes; every asserted outcome cites an
  existing pinned `oldid`.

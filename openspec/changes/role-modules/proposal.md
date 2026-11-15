# Proposal

## Why

Role rules are organised by scenario, not by role. `src/core/engine/bmr.ts`
(1557 lines) and `src/core/engine/sv.ts` (1460 lines) keep one role's night
step, death handling and win condition beside unrelated roles, and the Trouble
Brewing remainder is spread across `night.ts`, `death.ts`, `day.ts`,
`information.ts`, `effects.ts` and `setup.ts`. A change to one role therefore
touches several large files, and the blast radius is not visible.
`src/core/engine/index.ts` is a 127-line re-export façade, so the public surface
tells nothing about where a role actually lives; the weight is in `bmr.ts`
(1557 lines), `sv.ts` (1460), `day.ts` (972) and `night.ts` (956).

The compiler cannot help: `RoleId` is `string` (`src/core/model/types.ts:105`),
so a supported role can be absent from every dispatch table and the build still
passes. `scripts/openspec-check.mjs` states the same gap for tests — it proves a
requirement cites an existing file, not that a test asserts it.

Issue: #177

## What Changes

- Add `RoleModule`, a role contract with two optional hooks: a night-step
  contribution and a death hook. The six candidate hooks in the issue were
  checked against the engine; `setup`, `onExecution`, `registersAs` and
  `winCheck` stay in the engine, with the reason recorded per hook in
  `design.md`.
- Add one directory per supported role under `src/core/roles/<role-id>/` with
  `role.ts`. Each role declares its identifier and edition in the first stage;
  behaviour moves in later stages, one scenario at a time.
- Add `src/core/roles/registry.ts`, typed so that a missing or unknown supported
  role fails `npm run typecheck`. Introduce the literal role-id tuple that makes
  that check possible, with a drift test against `docs/official/roles.json`.
- Route the night queue and role death handling through the registry. The
  observable state stays identical: no rule, requirement or assertion changes.
- Add `rule.md` per role as a reference table: a rule identifier, the matrix row
  it audits, the pinned source revision and the asserting test names. It carries
  no copy of the official ability text; `docs/official/roles.json` and
  `docs/rules-matrix.md` stay the single sources.
- Put the rule ID in the name of each test that asserts a verified rule.
- Extend `scripts/check-acceptance.mjs`: a `verified` matrix row fails when its
  cited test does not carry a rule ID declared in that role's `rule.md`.
- Add `scripts/rules-for.mjs <roleId>`, which prints the official text, matrix
  row, spec requirements, tests and jinxes for one role.
- Keep the existing 290 scenario-suite tests in place. `role.test.ts` is added
  only where a role gains coverage that the scenario suites do not own.

Not in this change: game-rule changes, requirement or test-expectation changes,
event-log-as-source-of-truth, an effect pipeline, property-based tests, UI
changes, new dependencies.

## Capabilities

### New Capabilities

- `game/role-modules`: one module per supported role and a registry the compiler
  checks for completeness, with behaviour preserved.
- `workflow/rule-traceability`: rule identifiers in role documentation and test
  names, the check that connects a verified matrix row to its asserting test,
  and the per-role rule lookup tool.

### Modified Capabilities

None. The three scenario specs, `game/command-engine`, `game/setup`,
`game/day-and-win` and `game/state-and-storage` describe behavior that this
change preserves. They gain test names in their `**Tests**` lines at archive
time, which is citation metadata, not a requirement change.

## Impact

- `src/core/model/role-ids.ts` (new): the literal supported-role tuple and the
  `SupportedRoleId` type.
- `src/core/roles/` (new): `types.ts`, `registry.ts`, and one directory per
  supported role (72 roles: 22 Trouble Brewing, 25 Bad Moon Rising, 25 Sects &
  Violets), each with `role.ts` and `rule.md`.
- `src/core/engine/night.ts`: build the queue from module contributions.
- `src/core/engine/death.ts`: dispatch the death hook.
- `src/core/engine/bmr.ts`, `src/core/engine/sv.ts`: shrink as their role
  behavior moves to modules; the cross-role code stays.
- `src/core/engine/index.ts`: the public surface is unchanged.
- `scripts/check-acceptance.mjs`, `scripts/check-acceptance.test.mjs` (new or
  extended): the rule-ID check.
- `scripts/rules-for.mjs` (new) and its test.
- `docs/rules-matrix.md`: Test cells gain rule IDs; counts and levels unchanged.
- No change to `store.dispatch`, command contracts, the `{ ok, error }`
  convention, schema v4, or any screen.

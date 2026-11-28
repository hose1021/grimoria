# Proposal

Issue: #221

## Why

The evidence gate is strict for rows that already carry an identifier and lax
for rows that do not. `scripts/check-acceptance.ts` checks the tests cited by a
`verified` row and the identifiers declared in a role document, but it accepts a
matrix row with no identifier at all. On main at 5465e7e, 36 of 137 matrix rows
carried no identifier: 10 role rows and 26 cross-cutting rows.

The cross-cutting rows also have no document of their own, so their levels and
their asserting tests had nowhere to be declared. The rows about nominations,
wins, the night, effects, replay, scripts, privacy and localization are real
rules of this application even though they belong to no role.

## What Changes

- Add `docs/rules-shared.md`, with the same table shape as a role `rule.md`,
  declaring every cross-cutting rule under a new `SYS-<AREA>-NN` namespace.
- Give every supported matrix row exactly one identifier in its first column:
  the role identifier for role rows and the `SYS-` identifier for shared rows.
- Add a shared row for every cross-cutting rule that had none, and give every
  row without a test an honest level. No status is weakened.
- Rename the cited tests so that each verified row cites a test whose name
  carries the row's identifier. Assertions are unchanged; only test names and
  citations change.
- Extend `scripts/rule-traceability.ts`: a row must carry exactly one declared
  identifier, the declaration must match the row's level and revision, every
  declared identifier must map to a row, and every verified row must cite a test
  whose name carries its identifier. `scripts/check-acceptance.ts` loads the
  shared document and checks that its cited tests pass.
- Add focused tests for the four failures the gate must catch.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow/rule-traceability`: one identifier per matrix row, a shared rule
  document, and a strict verified-row test check.

## Impact

- `docs/rules-matrix.md`, `docs/rules-shared.md`, `docs/AGENTS.md`.
- `scripts/rule-traceability.ts`, `scripts/check-acceptance.ts`, and the two
  matching test files; `scripts/rules-for.ts` reads the wider identifier shape.
- `src/core/roles/*/rule.md` for the rows whose citations changed, and the test
  files whose names gained an identifier.
- No engine, command, state, storage, UI or dependency change. The support model
  and `README.md` counts stay identical.

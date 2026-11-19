# Tasks

## Evidence

- RED: `node --test --test-name-pattern="registered-dead Zombuul is not offered" src/application/read-models/table.test.ts` failed with `actual: ['1','2','3','4','5']`, `expected: ['2','3','4','5']`.
- GREEN: the same command passes; `npx tsc -p tsconfig.app.json --noEmit` and `-p tsconfig.test.json` pass.

## Work

- [x] Add `nominatorChoices` to the table read model.
- [x] Render the Virgin nomination picker from it.
- [x] Add the read-model regression test.
- [ ] Browser case for the picker once the Zombuul fixture is available in the harness.

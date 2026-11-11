# Tasks

## 1. RED: failing regressions

- [x] 1.1 Add `js/support.test.mjs`: every supported role has a level that matches the matrix rows, and the three levels name exactly the matrix's roles.
- [x] 1.2 Add the unknown-character test: `roleSupport("notarole")` is an explicit `unsupported` result.
- [x] 1.3 Add the script report test: Trouble Brewing is fully verified; Bad Moon Rising and Sects & Violets report their unsupported and Storyteller-choice counts; a script with Tinker is `requires-storyteller-choice`.
- [x] 1.4 Add the jinx tests: the table version equals the snapshot date, its pairs equal the official supported pairs, every pair has a source and reason, and a lookup over an unknown character is `unsupported`.
- [x] 1.5 Add the script-jinx test: a pool containing Fang Gu and the Scarlet Woman lists that jinx and is `requires-storyteller-choice`.
- [x] 1.6 Record the RED command and failure in the Evidence section.

## 2. GREEN: minimum implementation

- [x] 2.1 Add `src/core/model/jinxes.ts` with the seven applicable official pairs, their verbatim reasons and snapshot sources, the pinned version, the pair lookup and the script listing.
- [x] 2.2 Add the committed `docs/official/jinxes.json` snapshot with its source URL and committed date.
- [x] 2.3 Add `src/core/model/support.ts` with the 72-role level map, the explicit unknown-character result and the script support report.
- [x] 2.4 Show all three counts and the applicable jinxes on the `/bag` setup screen and in the script import preview.
- [x] 2.5 Add the ru/en/az strings with identical parameters.

## 3. Documentation

- [x] 3.1 Record the jinx snapshot in the pin table and rewrite the jinx limitation in `docs/rules-matrix.md`.
- [x] 3.2 Update the Custom scripts rows: support levels, jinx interactions, and the explicit unknown-character/version result with test citations.
- [x] 3.3 Update `docs/rules-sources.md`: sources, the supported jinx table and the three levels.
- [x] 3.4 Update `README.md` so the setup description and the test description match the code.

## 4. Verification

- [x] 4.1 Run `node --test js/support.test.mjs` and record GREEN.
- [x] 4.2 Run `npm run format`, `npm test`, `npm run verify`, `node scripts/openspec-check.mjs`, `openspec validate --changes --strict`, `openspec validate --specs --strict` and `git diff --check`.
- [x] 4.3 Report RED and GREEN evidence on the pull request; do not merge.

## Evidence

- RED: `node --test js/support.test.mjs` -> 1 test, 0 pass, 1 fail, `ERR_MODULE_NOT_FOUND` for `src/core/model/jinxes.ts` (the module did not exist yet).
- GREEN: `node --test js/support.test.mjs` -> 15 tests, 15 pass, 0 fail.
- GREEN: `npm test` -> 354 tests, 354 pass, 0 fail (baseline 339 + 15 new).

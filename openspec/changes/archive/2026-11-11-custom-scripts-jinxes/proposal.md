# Proposal

Issue: #44
Parent: #19

## Why

The custom-script pipeline claimed support for all 72 standard roles while the
audit table records host choices and unmodeled abilities, and it had no jinx
table at all. A script that contained a partially supported character was
presented as fully automated, the official jinx pairs were nowhere in the
engine, and `docs/rules-sources.md` said jinxes were outside the supported set.
Issue #44 requires three visible support levels, a versioned jinx table with a
test and a source for every applicable pair, and an explicit `unsupported`
result for an unknown character, jinx or rules version instead of a silent
manual fallback.

## What Changes

- Add a machine-readable support level for every supported character, derived
  from the rows of `docs/rules-matrix.md`: `verified`,
  `requires-storyteller-choice` or `unsupported`. An unknown character is an
  explicit `unsupported` result with a reason.
- Add a script support report: the weakest level, the count in each level, the
  triggering roles and the applicable jinxes. The `/bag` setup screen and the
  script import preview show all three counts and the jinx pairs.
- Commit the official `jinxes.json` snapshot as `docs/official/jinxes.json`,
  versioned by its committed date, and add the versioned table of the seven
  official pairs that apply to the supported characters. Every pair carries its
  verbatim official reason and a snapshot source; `js/support.test.mjs` fails
  when the table and the snapshot drift apart.
- Return an explicit `unsupported` result from the jinx lookup for an unknown
  character. The existing import rejection and ruleset-version rejection stay
  non-negotiable and gain test references.
- Update `docs/rules-matrix.md`, `docs/rules-sources.md` and `README.md` so the
  documented support and the code agree.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game/custom-scripts`: adds the three-level character support report, the
  versioned jinx table and the explicit unsupported results.

## Impact

- Runtime: `src/core/model/support.ts`, `src/core/model/jinxes.ts`,
  `src/ui/screens/bag.tsx`, `js/locales/{ru,en,az}.js`.
- Data: `docs/official/jinxes.json`.
- Tests: `js/support.test.mjs`; existing `js/scripts.test.mjs` and
  `js/commands.test.mjs` references for the import and version rejections.
- Docs: `docs/rules-matrix.md`, `docs/rules-sources.md`, `README.md`.
- No schema, command, persistence or dependency change.

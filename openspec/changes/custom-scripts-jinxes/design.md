# Design

## Decision

### Support levels come from the matrix, not from the role roster

`SUPPORTED_ROLES` answers "can this id enter a game", not "is the ability
automated". The three levels are derived from the audited rows:

- `verified`: every row for the role is `verified`.
- `requires-storyteller-choice`: at least one row is `host-choice` or
  `implemented-unverified`. The first is an official Storyteller decision; the
  second is engine code without an asserting test, so the host must still verify
  the outcome. Treating it as verified would contradict the TDD rule.
- `unsupported`: at least one row is `unsupported`.

`js/support.test.mjs` parses `docs/rules-matrix.md` and recomputes the level for
every supported character, so the code cannot drift from the table. The result
is 50 verified, 16 requires-storyteller-choice and 6 unsupported characters.

A script's level is never stronger than its weakest role. A pool that can
trigger an official jinx is at most `requires-storyteller-choice`; the engine
stores the interaction but does not resolve it.

### Jinxes are a versioned subset of the official snapshot

The official app publishes `https://release.botc.app/resources/data/jinxes.json`.
The committed snapshot wraps the verbatim entries with its source URL and the
date `2026-11-11`, and `JINX_RESOURCES_VERSION` repeats that date. The test
asserts:

- the table's version equals the snapshot's committed date;
- the table contains exactly the official pairs whose two ids are both
  supported;
- every pair's reason equals the official reason verbatim and its source names
  the snapshot path and the pair anchor.

The seven applicable pairs are all cross-edition, so a same-edition custom script
can never contain one; the setup screen lists them for a manual mixed pool,
which is the only script shape that can hold both members.

### Unknown character, jinx and version are explicit

- An unknown role id is still rejected at import with the role names, and the
  support classifier returns `unsupported` with `unknown character`.
- A jinx lookup over an unknown character returns `unsupported`, never `none`,
  so it cannot be mistaken for "no jinx".
- A ruleset version outside `SUPPORTED_RULESET_VERSIONS` is rejected before any
  mutation with `ruleset-version-unsupported`, as the command engine already
  does.

## Alternatives

- Derive the support level from `docs/official/roles.json`: rejected. That
  snapshot records metadata, not implementation status.
- Treat `implemented-unverified` as `verified`: rejected. The repository
  forbids claiming a mechanic without an asserting test.
- Embed the whole official jinx table and resolve every pair: rejected. The
  unsupported editions and roles are outside the pinned ruleset; only pairs
  whose two roles are supported are applicable.
- Add a jinx field to the script JSON: rejected. The official script tool does
  not carry jinxes; the table is global to the rules version.

## Compatibility

No schema or command change. Existing saves keep their script, and the new
report is computed on read. A saved script whose role is now classified
`unsupported` still loads; the setup screen labels it instead of blocking play.

## Risk

- The matrix level is a per-character roll-up. A character with one verified and
  one missing behavior is `unsupported`, which is deliberately pessimistic.
- The jinx table is a curated subset. A new official pair requires a snapshot
  update and a test change; the test fails if the snapshot gains a supported
  pair without the table.

## Verification

- RED: `node --test js/support.test.mjs` failed with
  `ERR_MODULE_NOT_FOUND` for `src/core/model/jinxes.ts`.
- GREEN: the same command passes 15 tests.
- `npm test` passes 354 tests; `npm run verify` and both OpenSpec validations
  pass.
- `scripts/browser-check.mjs` passes, including the setup support level and the
  Bad Moon Rising unsupported level.

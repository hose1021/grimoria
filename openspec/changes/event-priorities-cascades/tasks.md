# Tasks

## 1. RED: failing regressions

- [x] 1.1 Add `js/commands.test.mjs` cases for the frozen shared
      `EVENT_PRIORITY` list, an A→B→C cascade in one call, an
      insertion-order-independent cascade order, a typed `CYCLIC_CASCADE`
      rejection with the input unchanged, an effect chain in one graph
      resolution and an effect set resolved identically in both insertion
      orders.
- [x] 1.2 Add an `js/snv.test.mjs` case where one night records two deaths in
      both orders and assert the Barber's wake precedes the Sweetheart's in
      both.
- [x] 1.3 Run the two suites against the pre-change engine and record the
      failures.

## 2. GREEN: the shared priority and cascade resolver

- [x] 2.1 Add `EVENT_PRIORITY`, `CYCLIC_CASCADE` and `orderCascade` to
      `src/core/model/effect-graph.ts`.
- [x] 2.2 Replace the private effect topological sort with `orderCascade` and
      keep `CYCLIC_EFFECT_DEPENDENCY` as the command error code.

## 3. GREEN: deterministic death-triggered wakes

- [x] 3.1 Insert the Sects & Violets conditional wakes with `insertStepInto`
      instead of `Array.push`.
- [x] 3.2 Insert the Bad Moon Rising Grandmother wake with `insertStepInto`.

## 4. Review fix: sequence-index scale

- [x] 4.1 Resolve the S&V conditional wake slot from
      `nightSequence(night, "snv").indexOf(roleId)` instead of the printed
      0–99 sheet numbers.
- [x] 4.2 Resolve the BMR Grandmother slot from
      `nightSequence(night, "bmr").indexOf("grandmother")`.
- [x] 4.3 Strengthen the S&V test to assert the Barber and Sweetheart precede a
      later regular step, add the Sage case, and assert the Grandmother's slot
      and position before the Chambermaid.
- [x] 4.4 Document the within-class effect order in `design.md`.

## 5. Verification and documentation

- [x] 5.1 Run the targeted suites and confirm the new cases pass.
- [x] 5.2 Run `npm run format`, `npm test`, `npm run verify`,
      `node scripts/openspec-check.mjs`, `openspec validate --changes --strict`,
      `openspec validate --specs --strict` and `git diff --check`.
- [x] 5.3 Report the RED and GREEN evidence on the pull request; do not merge.

## Evidence

- RED: `node --test js/commands.test.mjs` -> `SyntaxError: The requested module
  './effect-graph.js' does not provide an export named 'CYCLIC_CASCADE'`; the
  shared priority and cascade resolver do not exist.
- RED: `node --test --test-name-pattern="death-triggered wakes" js/snv.test.mjs`
  -> 1 test, 1 fail: `AssertionError [ERR_ASSERTION]: the Barber's earlier wake
  slot precedes the Sweetheart's`, actual `[ 'sweetheart', 'barber' ]`, expected
  `[ 'barber', 'sweetheart' ]`.
- GREEN: `node --test --test-name-pattern="shared event priority|cascade
  chain|insertion order|cyclic cascade|effect chain A to B to C|same effect
  set|death-triggered wakes" js/commands.test.mjs js/snv.test.mjs` -> 7 tests,
  7 pass.
- RED (review fix): the same suites against the first implementation ->
  `actual: 73, expected: 17` for the Grandmother, `actual: 62, expected: 11` for
  the Sage, and the Barber/Sweetheart-before-Dreamer assertion `false`; the
  conditional steps used the printed sheet numbers on the compressed queue
  scale.
- GREEN (review fix): `node --test --test-name-pattern="death-triggered
  wakes|Sage's death-triggered|Grandmother stores" js/snv.test.mjs
  js/bmr.test.mjs` -> 3 tests, 3 pass.
- GREEN: `npm test` -> 347 tests, 347 pass, 0 fail.
- GREEN: `npm run verify`, `node scripts/openspec-check.mjs`,
  `openspec validate --changes --strict`, `openspec validate --specs --strict`
  and `git diff --check` pass.

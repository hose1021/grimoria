# Tasks

## 1. Row identifiers

- [x] 1.1 Add the declared identifier to the first cell of every role row, using
  the identifier its `rule.md` already declares.
- [x] 1.2 Fix the rows whose citation was rotated against their behaviour:
  the Godfather setup, first-night and other-night rows cite `03`, `01` and
  `02` respectively, and the Mathematician marking row cites `03`.
- [x] 1.3 Add a named citation to the Dreamer and Vortox rows that cited a file
  without a test name.
- [x] 1.4 Give the 26 cross-cutting rows a `SYS-<AREA>-NN` identifier in the
  first column.

## 2. Shared document

- [x] 2.1 Create `docs/rules-shared.md` with the four-column rule shape.
- [x] 2.2 Declare all 34 shared rules by area: setup, night, effects,
  nominations and votes, WINS, replay and state, scripts, privacy, localization.
- [x] 2.3 Cite the pinned revision each row names, or an explicit
  `app contract` marker for application-owned rows.
- [x] 2.4 Keep the one `implemented-unverified` localization row honest with no
  test citation.

## 3. Test names

- [x] 3.1 Add the `SYS-` identifier to the cited test of every verified shared
  row. Assertions are unchanged.
- [x] 3.2 Add the role identifier to the cited test of the host-choice rows that
  had none: Empath impairment, Chambermaid impairment, Pacifist, Tinker, Mutant,
  Cerenovus, Dreamer and Vortox false information.
- [x] 3.3 Update every citation in the matrix and the role documents to the new
  test names.

## 4. Checker

- [x] 4.1 RED: `node --test scripts/rule-traceability.test.ts` fails before the
  strict row rule exists.
- [x] 4.2 GREEN: `scripts/rule-traceability.ts` reads one identifier from the
  first cell, matches it to a declaration by identifier, and rejects the eight
  cases in the design.
- [x] 4.3 `scripts/check-acceptance.ts` loads `docs/rules-shared.md`, checks its
  cited tests pass and passes its rules to the traceability check.
- [x] 4.4 Add focused tests: a row without an identifier, a declared identifier
  without a row, a verified row whose test lacks the identifier, and a valid
  shared row.
- [x] 4.5 Keep the duplicate-identifier, missing-test and level-consistency
  checks.

## 5. Documentation

- [x] 5.1 Update `openspec/specs/workflow/rule-traceability/spec.md`.
- [x] 5.2 Point `docs/AGENTS.md` at the shared document.

## 6. Verification

- [x] 6.1 RED: with the identifier missing from a matrix row,
  `node scripts/check-acceptance.ts` failed with
  `carries 0 rule identifiers, expected exactly one`.
- [x] 6.2 GREEN: after the row identifiers, the shared document and the test
  names landed, `node scripts/check-acceptance.ts` passed with
  `72 matrix roles, 13 test files`.
- [ ] 6.3 `npm run typecheck`.
- [ ] 6.4 `npm test`.
- [ ] 6.5 `node --test scripts/*.test.ts`.
- [ ] 6.6 `node scripts/openspec-check.ts`, `openspec validate --changes --strict`.
- [ ] 6.7 `npm run lint`, `npm run format:check`.

## Evidence

- RED: `node scripts/check-acceptance.ts` reported the Juggler row and both
  localization rows as `carries 0 rule identifiers` before their identifiers
  landed, and named the orphan identifiers in the same run.
- GREEN: `node scripts/check-acceptance.ts` →
  `Acceptance check passed: 72 matrix roles, 13 test files.`
- Pinned sources stay in `docs/rules-matrix.md`; the shared document cites them
  and copies no wiki text.
- No demotion: all 121 verified and 15 host-choice rows keep their level. The
  single `implemented-unverified` localization row stays unverified because no
  test asserts a complete translation.

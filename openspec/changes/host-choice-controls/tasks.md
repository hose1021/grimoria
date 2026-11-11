# Tasks

## 1. Contract

- [x] 1.1 RED: `js/host-choice.test.mjs` fails because `HOST_CHOICE_CASES` and the answer check do not exist.
- [x] 1.2 GREEN: add `src/core/engine/host-choice.ts` with the case list, reasons, `caseForStep`, `givenIsLegal`, `legalRegistrations`, `registrationError`, `describeGiven` and `recordHostChoice`.

## 2. Enforcement

- [x] 2.1 RED: an answer outside the offered options is accepted.
- [x] 2.2 GREEN: `completeStep` rejects a Sects and Violets or Trouble Brewing information answer that is not one of the options (`error.66`), and leaves the step open.
- [x] 2.3 RED: a registration for another character is accepted.
- [x] 2.4 GREEN: `registrationError` runs before the step mutates (`error.67`).

## 3. Journal and projections

- [x] 3.1 GREEN: an accepted answer appends one secret `choice` line with its case, reason and value.
- [x] 3.2 GREEN: `publicGameView`, `publicSnapshot` and `playerSnapshot` stay free of the case and the reason.

## 4. Evidence

- RED: `node --test js/host-choice.test.mjs` → 6 tests, 0 pass, 6 fail (no `HOST_CHOICE_CASES`, an illegal answer accepted, no journal line).
- GREEN: `node --test js/host-choice.test.mjs` → 6 pass; `npm test` → 465 tests, 465 pass.
- `npm run verify` passes (typecheck, lint, format, tests, build, fallback, offline, source policy, acceptance).
- `node scripts/openspec-check.mjs`, `openspec validate --changes --strict` and `openspec validate --specs --strict` pass; `git diff --check` is clean.

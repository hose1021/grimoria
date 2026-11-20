# Tasks

## 1. Rules and characterization

- [x] 1.1 Read Washerwoman r2630, Librarian r1721, Investigator r2983 and the
      Spy/Recluse registration text. Rules check: compliant; the UI copies were
      the defect.
- [x] 1.2 Record RED: a wrong-team pair could show done, and a not-in-play role
      was offered without the registering player in the pair.

## 2. Console

- [x] 2.1 Add `obligationDone` and derive every information tick and the
      herring tick from `secretsErrors`.
- [x] 2.2 Replace `registering` with `pairRoles` in `infoRoleChoices` and pass
      the selected pair from the screen.

## 3. Tests

- [x] 3.1 Unit: every offered option with a fitting pair passes `secretsErrors`.
- [x] 3.2 Unit: the done mark agrees with the engine for a real, an absent and
      a Spy-registered answer.
- [x] 3.3 Unit: no not-in-play Minion without a Recluse in the pair.
- [x] 3.4 Browser `secrets-checks`: unanswered, wrong pair, real role and
      Spy-in-pair states show the matching tick.
- [x] 3.5 Findings F-011 and F-012 become behavioural.

## 4. Documents

- [x] 4.1 Cite the new tests in the setup-secrets spec and the matrix rows.
- [x] 4.2 No schema, storage or command payload change.

## 5. Evidence

- RED: F-011 and F-012 asserted the old text and the old option rule.
- GREEN: the three contract tests and the secrets-options suite pass; `PG_BROWSER_CHECK=secrets-checks` passes on 390 px; `npm test` 1,316 pass.

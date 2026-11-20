# Tasks

## 1. Rules and characterization

- [x] 1.1 Read Glossary r3168 §Start knowing, Pit-Hag r2998 §How to Run and
      Barber r1757 §Summary against the engine. Rules check: conflict with the
      old behavior, so the old guard was corrected, not preserved.
- [x] 1.2 Record RED: a created Clockmaker had no step, a Barber swap onto a
      Clockmaker had no step, and the Vortox case had no step to falsify.
- [x] 1.3 Keep the dead-created-character case: it passed before and after.

## 2. Engine

- [x] 2.1 Fall back to the gained character's first-night step in
      `requeueForCharacter` when the current night has no step for it.
- [x] 2.2 Insert the fallback immediately after the creating step.
- [x] 2.3 Keep the found stepping order: a dead actor gets nothing, a created
      Demon keeps no normal Demon turn, and a duplicate key is refused.
- [x] 2.4 Delete the old expectation that a created Clockmaker never wakes and
      replace it with the corrected assertion.

## 3. Tests

- [x] 3.1 Pit-Hag creates a Clockmaker on night two: the step follows the
      Pit-Hag step and offers the distance.
- [x] 3.2 Dead Pit-Hag target: no step.
- [x] 3.3 Living Vortox: the created Clockmaker's answer is falsified.
- [x] 3.4 Barber swap onto a Clockmaker: the new holder wakes.

## 4. Documents

- [x] 4.1 Cite the new tests in the Pit-Hag and Barber `rule.md` dossiers and
      the rules matrix.
- [x] 4.2 No schema, command payload or storage change; nothing to migrate.

## 5. Evidence

- RED: `node --test --test-name-pattern="start-knowing information that night|Vortox falsifies the information of a Clockmaker|Barber swap grants the start-knowing" src/core/engine/snv.test.ts` reported 2 passed, 3 failed; the created Clockmaker had no step, and the old fixture asserted that a created Clockmaker never wakes.
- GREEN: the same command reports 5 tests, 5 passed.
- GREEN: `node --test src/core/engine/snv.test.ts` reports 185 tests, all passed.
- GREEN: `npm test` reports 1,303 tests, all passed.
- GREEN: `node scripts/verification/gates.ts --scope=verified` passes on the regenerated traceability artifacts and `node scripts/check-acceptance.ts` passes.
- GREEN: `openspec validate --changes --strict` and `node scripts/openspec-check.ts` pass.

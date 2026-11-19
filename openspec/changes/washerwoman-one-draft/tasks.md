# Tasks

## 1. Rules and reproduction

- [x] 1.1 Read the pinned Washerwoman r2630 "How to Run" and States r1039
      "Drunkenness and Poisoning". A healthy Washerwoman shows two players and
      one Townsfolk among them; a drunk or poisoned player has no ability and
      may be shown false information; the Storyteller does not tell the player
      about the poisoning. Rules check: compliant.
- [x] 1.2 Reproduce the poisoned card in the running app: the step sheet shows
      the role select and the template, the card prefers the role after it is
      chosen, the template never reaches the command, and the journal records
      `6 / 5` with no character.
- [x] 1.3 Name the first divergent layer: the console stored two drafts
      (`givens` and `infoTemplate`) and the card read one of them while the
      command read only the other. The engine record was consistent.

## 2. Engine

- [x] 2.1 Add the failing command tests: a duplicate, unknown or one-player
      pair is refused; a healthy answer that differs from the prepared record
      is refused; a legal answer is stored and replays.
- [x] 2.2 Validate a one-of-two answer as a whole in `givenIsLegal` and
      `validateGiven`, with the state available for the player references.
- [x] 2.3 Record `answerText` with the answer and show it in `describeGiven`.
- [x] 2.4 Format a journaled one-of-two answer as the character and the
      players; localize the character in the console.
- [x] 2.5 Keep the legacy zero and prepared journals replayable without a
      ruleset version bump.

## 3. Screens

- [x] 3.1 Remove the step-independent `infoTemplate`; the template writes
      `answerText` into the step's `givens` draft.
- [x] 3.2 Keep an existing wording when the host chooses a role or a value.
- [x] 3.3 Make the private card read the draft, then `step.given`, and use the
      recorded impairment when the draft is gone.
- [x] 3.4 Clear every draft map on completion, and the given and registrations
      on a target change.
- [x] 3.5 Accept `answerText` in a restored draft.

## 4. Tests

- [x] 4.1 Engine: `a poisoned Washerwoman's answer is a Townsfolk and two
      different players` and `a healthy Washerwoman refuses an answer that is
      not the prepared one`.
- [x] 4.2 UI: `an impaired actor card shows the chosen answer and its wording`
      and `applyGiven keeps the Storyteller's wording in the same answer`.
- [x] 4.3 Browser: the focused `washerwoman` check types a wording, chooses a
      role, confirms, reads the journal, reloads, then plays a healthy
      Washerwoman.
- [x] 4.4 Update the existing one-of-two journal expectations to the named
      detail.

## 5. Documents

- [x] 5.1 Cite the new tests in the Washerwoman dossier and the matrix row.
- [x] 5.2 Regenerate the verification traces.

## 6. Verification

- [x] 6.1 RED: the two new engine tests failed on the base code (a duplicate
      pair and a healthy replacement were both `allowed`).
- [x] 6.2 GREEN: `node --test --test-name-pattern="poisoned Washerwoman's
      answer|healthy Washerwoman refuses" src/core/engine/engine.test.ts`
      reports 2 tests, 2 passed.
- [x] 6.3 `npm test` reports 1,295 tests, all passed.
- [x] 6.4 `npm run verify` passes.
- [x] 6.5 Full browser suite passes; `PG_BROWSER_CHECK=washerwoman` passes.
- [x] 6.6 `npm run scenarios` reports 10/10 after the `/pocket/` build.
- [x] 6.7 `node scripts/verification/gates.ts --scope=verified` and
      `node scripts/check-acceptance.ts` pass.
- [x] 6.8 `openspec validate --changes --strict` passes.

## Evidence

- RED: `node --test --test-name-pattern="poisoned Washerwoman's answer|healthy
  Washerwoman refuses" src/core/engine/engine.test.ts` on the base code:
  2 tests, 0 passed. The duplicate pair and the affected answer were `allowed`.
- GREEN: the same command after the change: 2 tests, 2 passed.
- GREEN: the poisoned browser check shows the typed wording on the card after
  the role is chosen, stores `{ roleId: "monk", pair: ["6","5"], answerText }`,
  clears the step draft, shows the wording in the journal, and keeps it after a
  reload.
- GREEN: the healthy browser check has no template control, the card names the
  prepared `chef` and `P6`, and the stored answer is `{ roleId: "chef",
  pair: ["6","5"] }` with no `answerText`.

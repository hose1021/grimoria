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

- [x] 2.1 Add the failing command tests: a duplicate, unknown, one-player or
      missing pair is refused; a healthy answer that differs from the prepared
      record is refused; a legal answer is stored and replays.
- [x] 2.2 Validate a one-of-two answer as a whole in `givenIsLegal` and
      `validateGiven`, with the state available for the player references.
- [x] 2.3 Record `answerText` with the answer and show it in `describeGiven`.
- [x] 2.4 Format a journaled one-of-two answer as the character and the
      players; localize the character in the console.
- [x] 2.5 Version the full check at `tb-bmr-snv-2026-11-20.1`; an earlier
      command keeps the role-only check. Prove it with a replay of a different
      healthy answer recorded under `tb-bmr-snv-2026-11-19`.

## 3. Screens

- [x] 3.1 Remove the step-independent `infoTemplate`; the template writes
      `answerText` into the step's `givens` draft.
- [x] 3.2 Keep an existing wording when the host chooses a role or a value.
- [x] 3.2a Offer both players beside the role for a one-of-two answer that
      asks the host, and write them into the same draft.
- [x] 3.3 Make the private card read the draft, then `step.given`, and use the
      recorded impairment when the draft is gone.
- [x] 3.4 Clear every draft map on completion, and the given and registrations
      on a target change.
- [x] 3.5 Accept `answerText` in a restored draft.

## 4. Tests

- [x] 4.1 Engine: `a poisoned Washerwoman's answer is a Townsfolk and two
      different players`, `a healthy Washerwoman refuses an answer that is
      not the prepared one`, and `a journal recorded before the full one-of-two
      check replays a different healthy answer`.
- [x] 4.2 UI: `an impaired actor card shows the chosen answer and its wording`
      and `applyGiven keeps the Storyteller's wording in the same answer`.
- [x] 4.3 Browser: the focused `washerwoman` check chooses a role and both
      players, opens the card with and without a wording, confirms, reads the
      pair and the character in the journal, reloads, then plays a healthy
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
- [x] 6.3 `npm test` reports 1,296 tests, all passed.
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
- GREEN: the poisoned browser check chooses the role `monk` and the pair
  `P2 / P3`, opens the card without a wording, confirms, stores
  `{ roleId: "monk", pair: ["2","3"] }`, shows the character and both players
  in the journal, and keeps them after a reload. A second run adds the wording
  and stores `answerText` with the same role and pair.
- GREEN: the healthy browser check has no template control, the card names the
  prepared `chef` and `P6`, and the stored answer is `{ roleId: "chef",
  pair: ["6","5"] }` with no `answerText`.
- GREEN: `a journal recorded before the full one-of-two check replays a
  different healthy answer` applies `{ roleId: "imp", pair: ["2","3"] }` under
  `tb-bmr-snv-2026-11-19` and replays the journal to the same canonical state.

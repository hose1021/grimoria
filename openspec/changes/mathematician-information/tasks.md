# Tasks

## 1. Rules and characterization

- [x] 1.1 Read the pinned Mathematician (r3153) text in
      `docs/rules-matrix.md`, `src/core/roles/mathematician/rule.md` and
      `docs/adr/0002-engine-contracts.md` slice 5. Rules check: compliant; the
      move is behavior-preserving and no matrix row or pin changes.
- [x] 1.2 Add role tests for `informationOf` and the resolver on the untouched
      branch: the value for no marks and for two, the possible range 0 to the
      seat count, and the same decision with `impaired: true`.
- [x] 1.3 Add a characterization test to `snv.test.ts` for one healthy
      Mathematician step: preview leaves the canonical state unchanged, apply
      stores the exact `given` and clears the ledger, the step is stamped with
      the command time, the public view omits the answer and the mark reason,
      replay and undo match, and export/import round-trips.
- [x] 1.4 Add the both-at-once case (a poisoned Mathematician beside a living
      Vortox) and the host-choice case (an impaired Mathematician's answer is
      journaled as secret false information).

## 2. Contract

- [x] 2.1 Add `abnormalCount: number` to `InformationContext` beside
      `isAlive`, documented as a count and never a reason.
- [x] 2.2 Add `abnormalCount` to the literal contexts of the Chef, Clockmaker,
      Empath, Fortune Teller, Oracle, Ravenkeeper and Undertaker role tests.
      The untouchable Proxy stubs need nothing.
- [x] 2.3 Assert the fact through the engine context in `engine.test.ts`: 0
      with no marks, 2 for two distinct players, 1 for a duplicate mark, and 0
      after the ledger empties.

## 3. Engine

- [x] 3.1 Move `abnormalCount` to `information-facts.ts` and supply
      `abnormalCount` in `informationFacts`; re-export the binding from
      `sv.ts` so `engine/index.ts` and its callers are unchanged.
- [x] 3.2 In the Mathematician branch, replace the count with
      `resolveInformationCapability(roleModule(role), informationFacts(...))`
      and derive the options from `decision.possible`; keep the impairment,
      Vortox, suffix, text and shape code byte-identical.

## 4. Role

- [x] 4.1 Add `{ kind: "information", infoKind: "mathematician", resolve }`:
      the `abnormalCount` fact and every number up to the seat count as
      possible.
- [x] 4.2 Keep the `night-step` declaration unchanged.
- [x] 4.3 Leave the ledger clear in `completeSvStep` and the skipped-actor path
      in `night.ts`.

## 5. Ledger, specs and verification

- [x] 5.1 Regenerate `docs/role-ownership.md`: the row declares
      `capability:information` and keeps "capability + engine reference".
- [x] 5.2 Add this OpenSpec change with the delta under
      `specs/game/role-modules/spec.md`.
- [x] 5.3 Run `npm test`, `npm run typecheck`, `npm run format:check`,
      `npm run verify`, `node scripts/role-ownership.ts --check`,
      `node scripts/check-acceptance.ts`, `openspec validate --changes
      --strict` and `node scripts/openspec-check.ts`.

## 6. Evidence

- RED: `node --test src/core/roles/mathematician/role.test.ts` on untouched
  `origin/dev` fails all three tests with "the module owns the answer"; the new
  engine characterization tests pass before and after the move (3/3 role tests
  fail, `--test-name-pattern="Mathematician|mathematician"` on `snv.test.ts`
  passes 8/8).
- GREEN: the role test passes 3/3; the Mathematician, Vortox and context tests
  pass 11/11 in `snv.test.ts` and `engine.test.ts`.
- Stored record: the healthy step stores `value: 1`, `textKey:
  "note.sv.mathematician"`, `falsifiedSuffix: false`,
  `mayBeFalseSuffix: false`, `options: []` and the unchanged Russian text.

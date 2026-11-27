# Tasks

## 1. Rules and characterization

- [x] 1.1 Read the pinned Clockmaker (r2967), Oracle (r2909) and Glossary
      (r3168) text and both `rule.md` files. Rules check: compliant.
- [x] 1.2 Add role tests for `informationOf` and the resolver on the untouched
      branch: the value, the possible range, the dead-Minion case for the
      Clockmaker, the dead-good and resurrected cases for the Oracle, and the
      same decision with `impaired: true`.
- [x] 1.3 Add characterization tests to `snv.test.ts` for one Clockmaker and
      one Oracle step: preview leaves the canonical state unchanged, apply
      stores the exact `given`, the step is stamped with the command time, the
      public view omits the answer, replay and undo match, and export/import
      round-trips.
- [x] 1.4 Add the both-at-once case (impaired Clockmaker beside a living
      Vortox) and the host-choice case (an impaired Clockmaker's answer is
      journaled as secret false information).

## 2. Contract

- [x] 2.1 Add `isAlive(playerId): boolean` to `InformationContext` and supply
      it in `informationFacts`.
- [x] 2.2 Add `isAlive` to the literal contexts of the Chef, Empath, Fortune
      Teller, Ravenkeeper and Undertaker role tests.
- [x] 2.3 Assert a living, a dead and an unknown seat through the engine
      context in `engine.test.ts`.

## 3. Engine

- [x] 3.1 Move `registrationApplies`, `alignmentOf`, `registersAs*`,
      `characterChoices`, `executedOn` and `informationFacts` to
      `information-facts.ts`; re-export the public names from
      `information.ts` and import only `informationFacts` in `sv.ts`.
- [x] 3.2 In the Clockmaker branch, replace the counting with
      `resolveInformationCapability(roleModule(role), informationFacts(...))`
      and derive the options from `decision.possible`; keep the impairment,
      Vortox, suffix, text and shape code.
- [x] 3.3 Do the same in the Oracle branch.
- [x] 3.4 Add `information-facts.ts` to the coordinators in
      `scripts/role-ownership.ts`.

## 4. Role

- [x] 4.1 Add `{ kind: "information", infoKind: "clockmaker", resolve }`: the
      circular distance to the nearest Minion in play and every number up to
      the seat count as possible.
- [x] 4.2 Add `{ kind: "information", infoKind: "oracle", resolve }`: the
      number of dead evil players and every number up to the seat count as
      possible.
- [x] 4.3 Keep both `night-step` declarations unchanged.

## 5. Ledger, specs and verification

- [x] 5.1 Regenerate `docs/role-ownership.md`: both rows declare
      `capability:information` and keep `sv.ts` as the presentation
      reference; the Recluse and Spy references move to
      `information-facts.ts`.
- [x] 5.2 Add this OpenSpec change with the delta under
      `specs/game/role-modules/spec.md`.
- [x] 5.3 Run `npm test`, `npm run typecheck`, `npm run format:check`,
      `npm run verify`, `node scripts/role-ownership.ts --check`,
      `node scripts/check-acceptance.ts`, `openspec validate --changes
      --strict` and `node scripts/openspec-check.ts`.

## 6. Evidence

- RED: `node --test src/core/roles/clockmaker/role.test.ts
  src/core/roles/oracle/role.test.ts` on untouched `origin/dev` fails with
  "the module owns the answer" for the nine new role tests; the engine
  characterization tests pass before and after the move.
- GREEN: the same command passes 9/9 after the capability and wrapper change;
  `node --test --test-name-pattern="Clockmaker|Oracle|Vortox|impaired"
  src/core/engine/snv.test.ts` passes 35/35.

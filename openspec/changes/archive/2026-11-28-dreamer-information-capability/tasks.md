# Tasks

## 1. Rules and characterization

- [x] 1.1 Read the pinned Dreamer (r2904), Spy (r3118), Recluse (r3007) and
      Vortox (r3017) text. Rules check: compliant — one good and one evil
      character, one correct, the false token of the opposite kind, the
      Storyteller chooses it, and a Vortox makes both false.
- [x] 1.2 Add the role tests on the untouched branch: the module owns the
      `role-pair` answer; the resolver names the target, both pools and the
      registration facts and no pair; `impaired` changes nothing; the Spy and
      Recluse facts pass through; no target and an unknown seat ask for no
      pair.
- [x] 1.3 Keep the existing engine tests as the characterization gate: a sober
      pair, an impaired and a Vortox pair, the self-target refusal, privacy,
      preview/apply/replay/undo/export, the legacy 0.4.1 journal and the two
      command-version cases.

## 2. Contract

- [x] 2.1 Add the `role-pair` arm to `InformationDecision` with `subjectId`,
      `good`, `evil` and `possible` and no final answer.
- [x] 2.2 Add the compile-time checks: a role cannot add a `pair` or an
      `impaired` field to the arm.

## 3. Role

- [x] 3.1 Add `{ kind: "information", infoKind: "dreamer", resolve }`: the
      chosen target, every supported Townsfolk and Outsider, every supported
      Minion and Demon, and `mayRegisterAsCharacters(target)`.
- [x] 3.2 Return `no-effect` without a target or for a seat that is not in the
      game.
- [x] 3.3 Keep the `night-step` declaration unchanged.

## 4. Engine

- [x] 4.1 Replace the pool, registration and pair derivation in the Dreamer
      branch with `resolveInformationCapability(roleModule("dreamer"),
      informationFacts(...))` and build the options from the decision.
- [x] 4.2 Keep the `requiresInfoPair` gate, the legacy free-text note, the
      impairment flag, `vortoxFalsifies`, the host-answer flag, the text key,
      the variables, the text, the suffixes and the stored `role-pair` record.
- [x] 4.3 Remove the dead `supportedRolesOf` and `possibleCharacters` helpers
      and the unused `SUPPORTED_ROLES` import.

## 5. Ledger, specs and browser check

- [x] 5.1 Add `scripts/browser-check.ts` case `dreamer-pair`, registered in
      `focusedChecks` and `fullChecks`: choose the target and pair on `/table`,
      then check the stored record, the secret journal entry, the public view,
      replay and reload.
- [x] 5.2 Add this OpenSpec change under
      `openspec/changes/dreamer-information-capability/`.
- [x] 5.3 Update the Dreamer rule reference and the matrix test references.
- [x] 5.4 Regenerate the verification manifest, trace and coverage records.

## 6. Verification and evidence

- [x] 6.1 `npm test`, `npm run typecheck`, `npm run format:check`,
      `npm run verify`, `node scripts/verification/gates.ts --scope=all`,
      `openspec validate --changes --strict`, `node scripts/openspec-check.ts`.
- [x] 6.2 `PG_BROWSER_CHECK=dreamer-pair node scripts/browser-check.ts`.

## 7. Evidence

- RED: `node --test src/core/roles/dreamer/role.test.ts` on the untouched
  `origin/dev` fails 5 of 5 role tests with "the module owns the answer"; the
  engine tests pass unchanged before and after the move.
- GREEN: `node --test src/core/roles/dreamer/role.test.ts` passes 5/5;
  `node --test --test-name-pattern="Dreamer" src/core/engine/snv.test.ts`
  passes 11/11; `npm test` passes 1439/1439.
- `npm run verify` passes: typecheck, lint, format, 1439 tests, build,
  fallback, offline, types policy, role ownership, official provenance,
  acceptance, version and ledger.
- `VERIFICATION_BASE_REF=origin/dev node scripts/verification/gates.ts
  --scope=all` passes: 523 official rules, 172 engine rules, 87 UI contracts,
  0 findings.
- `PG_BROWSER_CHECK=dreamer-pair node scripts/browser-check.ts` passes:
  `PASS dreamer-pair (435 ms)`.
- `openspec validate --changes --strict` passes 20/20;
  `node scripts/openspec-check.ts` passes 27 specs, 20 active changes.


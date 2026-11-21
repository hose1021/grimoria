# Tasks

## 1. Rules and characterization

- [x] 1.1 Read the pinned Evil Twin text (r3101) §How to Run. Rules check:
      compliant — wake both Twins on the first night, point at each and show
      the other's token; the change only types the record of that wake.
- [x] 1.2 Add the role tests on the untouched branch: the module owns the
      answer, `shown` follows `[evil, good]`, an unpaired holder names nobody,
      and an unknown character stays `null`.
- [x] 1.3 Keep the engine tests as the characterization gate: the exact
      `given`, missing note for unpaired/dead/impaired, preview/apply parity,
      replay, undo, export/import, the legacy text-only note and privacy.

## 2. Contract

- [x] 2.1 Add `ShownTwin` and the optional `shown` field on the `note` arm.
- [x] 2.2 Add `twins: { goodId; evilId } | null` to `InformationContext`.
- [x] 2.3 Add `shown` to `InfoResult`.
- [x] 2.4 Add compile-time checks: a shown entry names its player and
      character, carries no `name`, and a note still cannot carry an answer.

## 3. Fact and role

- [x] 3.1 Let `informationFacts` accept the validated pair and default to
      `null`, with no `death.ts` import.
- [x] 3.2 Add the `information` capability with `infoKind: "eviltwin"` and keep
      the first-night `night-step`.
- [x] 3.3 Add `twins: null` to the role test builders that spell a full
      context.

## 4. Engine

- [x] 4.1 Replace the Evil Twin branch with
      `resolveInformationCapability(roleModule("eviltwin"), informationFacts(…,
      twins: evilTwinPair(state)))` and keep the wording, variables, text and
      field order.
- [x] 4.2 Add `EVIL_TWIN_SHOWN_RULESET_VERSION`, the support set, the
      `recordsEvilTwinShown` gate and every current-behavior predicate.
- [x] 4.3 Append `shown` last and only when the note actually showed a pair.

## 5. Ledger and specs

- [x] 5.1 Regenerate `docs/role-ownership.md`.
- [x] 5.2 Add this OpenSpec change under
      `openspec/changes/evil-twin-information/`.

## 6. Verification and evidence

- [x] 6.1 `node --test src/core/roles/eviltwin/role.test.ts`,
      `node --test --test-name-pattern="Evil Twin|introduction"
      src/core/engine/snv.test.ts`, `npm run typecheck`, `npm test`,
      `npm run lint`, `npm run format:check`, `npm run verify`,
      `node scripts/role-ownership.ts --check`, `openspec validate
      --changes --strict`, `node scripts/openspec-check.ts`.
- [x] 6.2 `PG_BROWSER_CHECK=evil-twin-introduction node scripts/browser-check.ts`.

## 7. Evidence

- RED: the new role test fails 4/4 on the untouched base with "the module owns
  the answer"; the engine introduction test fails because the stored note has
  no `shown` record.
- GREEN: the focused role, fact and Evil Twin engine tests pass; `npm test`
  passes 1446/1446; `npm run verify` passes; `openspec validate --changes
  --strict` passes 21/21; `node scripts/openspec-check.ts` passes 27 specs and
  21 active changes; `VERIFICATION_BASE_REF=origin/feat/dreamer-information-contract
  node scripts/verification/gates.ts --scope=all` passes with 0 findings;
  `PG_BROWSER_CHECK=evil-twin-introduction node scripts/browser-check.ts`
  passes.


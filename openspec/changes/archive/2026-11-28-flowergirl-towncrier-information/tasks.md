# Tasks

## 1. Rules and characterization

- [x] 1.1 Read the pinned Flowergirl (r2907) and Town Crier (r3145) text in
      `docs/rules-matrix.md` and both `rule.md` files. Rules check: compliant;
      the move is behavior-preserving and no matrix row or pin changes.
- [x] 1.2 Add role tests for `informationOf` and the resolver on the untouched
      branch: the declaration kinds, `infoKind`, `true`/`false` from
      `votesToday`, the same decision with `impaired: true`, and the null fact.
      Every other fact throws.
- [x] 1.3 Add a fact test for `votesOn`: null for a missing day, another day
      number, a non-array nomination list and both `voteCounts` shapes; the
      vote-time snapshots; and the legacy current-role fallbacks.
- [x] 1.4 Add an engine test: a day whose `demonVoters` snapshot is stripped
      still answers `true` from the votes, so the moved reduction cannot
      silently return false.

## 2. Contract

- [x] 2.1 Add `votesToday: { demonVoted; minionNominated } | null` to
      `InformationContext`.
- [x] 2.2 Add `votesToday: null` to the literal contexts of the Chef,
      Clockmaker, Empath, Fortune Teller, Mathematician, Oracle, Ravenkeeper and
      Undertaker role tests. The Proxy stubs need nothing.

## 3. Engine

- [x] 3.1 Move the `lastDayFor` shape check and the nomination reduction into
      `information-facts.ts` as `votesOn(state, dayNumber)`; supply
      `votesToday: votesOn(state, query.at.number - 1)`.
- [x] 3.2 In the Flowergirl/Town Crier branch, replace the reduction with
      `resolveInformationCapability(roleModule(role), informationFacts(...))`
      and derive the options from `decision.possible`; keep the no-day record,
      impairment, Vortox, suffix, text and shape code unchanged.
- [x] 3.3 Delete `lastDayFor` from `sv.ts`.

## 4. Role

- [x] 4.1 Add `{ kind: "information", infoKind: "flowergirl", resolve }`:
      `votesToday.demonVoted` and `[true, false]`.
- [x] 4.2 Add `{ kind: "information", infoKind: "towncrier", resolve }`:
      `votesToday.minionNominated` and `[true, false]`.
- [x] 4.3 Keep both `night-step` declarations unchanged.

## 5. Ledger, specs and verification

- [x] 5.1 Update the `scripts/role-ownership.test.ts` expectations and
      regenerate `docs/role-ownership.md`: both rows declare
      `capability:information` and keep "capability + engine reference".
- [x] 5.2 Add this OpenSpec change with the delta under
      `specs/game/role-modules/spec.md`.
- [x] 5.3 Record the two renamed declaration tests in
      `docs/audits/verification-gates/removed-tests.json`.
- [x] 5.4 Regenerate the test manifest and traceability with
      `npm run verification:build`.
- [x] 5.5 Run `npm test`, `npm run typecheck`, `npm run format:check`,
      `npm run verify`, `node scripts/role-ownership.test.ts`,
      `node scripts/check-acceptance.ts`, `openspec validate --changes
      --strict` and `node scripts/openspec-check.ts`.

## 6. Evidence

- RED: `node --test src/core/roles/flowergirl/role.test.ts
  src/core/roles/towncrier/role.test.ts src/core/engine/information-facts.test.ts`
  on untouched `origin/dev` fails all six role tests with "the module owns the
  answer" and the fact file with "does not provide an export named `votesOn`".
- GREEN: the same command passes 11/11, and the Flowergirl/Town Crier engine
  tests pass 11/11.
- Stored record: unchanged `value`, `textKey`, `text`, `options`, suffixes and
  key order; the no-day record keeps `hostAnswer: true`,
  `options: [true, false]` and `note.sv.noDay`.

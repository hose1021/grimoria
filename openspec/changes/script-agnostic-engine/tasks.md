# Tasks

## 1. Discovery and rules check

- [x] 1.1 Audit every production edition gate. Classified role-presence gates
      as safe; identified the queue dispatcher, the setup/state manual fallback,
      the BMR/S&V secrets short-circuit and the mixed import rejection as the
      blockers.
- [x] 1.2 Audit the seven official jinxes. None has a joint behavior or an
      asserting test; the two-Demon and Goon/Pit-Hag cases are direct gaps.
- [x] 1.3 Read the pinned Soldier r3121, Monk r3124, Poisoner r1737, Imp r3116,
      Sailor r1768, Courtier r2968 and Clockmaker r2967 rows, plus
      `docs/official/nightsheet.json` and the jinx snapshot. Rules check:
      compliant — the change composes existing verified behavior and adds no
      new rule.

## 2. Script definition and compatibility

- [x] 2.1 Add `src/core/model/night-order.ts` as the supported projection of
      the official nightsheet, with both night lists and a rank lookup.
- [x] 2.2 Add `src/core/model/interactions.ts` with every official jinx, its
      pin, status and status reason. Unclassified pairs fail at load.
- [x] 2.3 Add `src/core/model/script-definition.ts`: `defineScript`,
      `scriptCompatibility`, `scriptRunsAutomatically` and the manual-fallback
      predicate.
- [x] 2.4 Add focused tests for verified, host-choice, jinxed, unknown and
      manual pools, and for the official order projection.

## 3. Mixed composition

- [x] 3.1 Split the TB builder from the dispatcher and add
      `buildMixedNightQueue`: TB + BMR + S&V role steps, one system pair, one
      official order.
- [x] 3.2 Add `normalizeMixedQueue` and call it after every conditional insert.
- [x] 3.3 Compose `appendConditionalSteps` for a mixed script: BMR, S&V, TB,
      reconcile, normalize.
- [x] 3.4 Keep exact single-edition builders, keys and journals unchanged.
- [x] 3.5 Compose setup secrets instead of skipping them for any BMR/S&V role.

## 4. Import, state and UI

- [x] 4.1 Accept a mixed pool of supported characters at import; keep unknown,
      traveller-only, short-roster and missing-team rejection.
- [x] 4.2 Derive the manual fallback from compatibility in `normalizeScript`,
      state normalization and state validation.
- [x] 4.3 Show role counts, non-verified interactions and the automatic/manual
      mode in the bag, secrets and help screens.
- [x] 4.4 Add RU/EN/AZ strings for the new diagnostics.

## 5. Evidence

- RED: the old contract tests failed on the new behavior as expected —
  `a mixed edition must be rejected`, `mixed-edition`, and the script parser
  mixed rejection. Each was replaced with the new contract assertion, not
  deleted.
- GREEN: `node --test src/core/model/night-order.test.ts
  src/core/model/script-definition.test.ts` passes 10/10.
- GREEN: `node --test src/core/engine/mixed.test.ts` passes 2/2.
- GREEN: `npm test` passes 1557/1557; `npm run typecheck` passes; `oxlint`
  passes.
- [x] 5.1 RED: the old contract tests failed on the new behavior as expected —
      `a mixed edition must be rejected`, `mixed-edition`, and the script parser
      mixed rejection. Each was replaced with the new contract assertion, not
      deleted.
- [x] 5.2 GREEN: `node --test src/core/model/night-order.test.ts
      src/core/model/script-definition.test.ts` passes 10/10.
- [x] 5.3 GREEN: `node --test src/core/engine/mixed.test.ts` passes 2/2:
      cross-edition queue, Sailor/Poisoner/Courtier effects, Clockmaker answer,
      night two, journal replay; the Scarlet Woman keeps the dead Demon's
      character, the No Dashii respects Soldier/Monk protection, a Drunk shown
      an S&V townsfolk wakes, and an unsupported pool cannot start.
- [x] 5.4 GREEN: `npm test` passes 1553/1553.
- [x] 5.5 `npm run typecheck` passes; `oxlint` passes; changed files formatted.
- [x] 5.6 Browser check passed on the integration head; PR #476 merged and
      PR #477 repeats the full suite at `c50c1e8`.

## 6. Deliberate contract changes

- [x] 6.1 `src/core/model/scripts.test.ts`: a mixed supported pool is accepted.
- [x] 6.2 `src/core/engine/setup.test.ts`: the old `mixed-edition` rejection is
      replaced by `script-unsupported` for an uncertified pool.
- [x] 6.3 `src/core/engine/manual.test.ts`: a certified mixed pool without the
      flag deals automatically; an old certified save stays automatic.
- [x] 6.4 `src/core/engine/snv.test.ts`: the mixed parser case now asserts
      acceptance.

## 7. Deferred to separate scopes

- [x] Implement the seven jinx behaviors and upgrade their registry status
      (PR #477, `openspec/changes/verified-jinx-behaviors`).
- [ ] Al vs Al characters and their interactions (blocked on the roster and
      pinned sources; see `docs/audits/al-vs-al-readiness.md`).
- [ ] Travellers, Fabled and Loric.
- [x] Browser and independent rules audit of this change on the integration
      head (PR #476 CI; PR #477 CI at `c50c1e8`).

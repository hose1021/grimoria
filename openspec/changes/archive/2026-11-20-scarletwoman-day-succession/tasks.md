# Tasks

## 1. Evidence

- [x] 1.1 Read Scarlet Woman r3117 "How to Run" and Imp r3116 from the pinned
      local snapshots.
- [x] 1.2 Reproduced the gap: a Demon executed during the day leaves the next
      night queue without a `demonchange` step.
- [x] 1.3 Recorded RED:
      `node --test --test-name-pattern="daytime Scarlet Woman succession" src/core/engine/engine.test.ts`
      failed at `the new Imp is woken after a daytime succession`.

## 2. Implementation

- [x] 2.1 `endDay` carries `state.night.demonChanged` into the next night.
- [x] 2.2 After the queue build, a set flag calls `appendConditionalSteps` and
      is cleared.
- [x] 2.3 RED → GREEN on the new test.

## 3. Evidence surfaces

- [x] 3.1 `src/core/roles/scarletwoman/rule.md` declares
      `TB-SCARLETWOMAN-02` with pinned r3117 and the asserting test.
- [x] 3.2 `docs/rules-matrix.md` gains a `New Demon wake` row with the same
      pin, behavior, host decision and test.

## 4. Verification

- [x] 4.1 `npm test` — 649 pass, 0 fail.
- [x] 4.2 `npm run typecheck` — pass.
- [x] 4.3 `node scripts/check-acceptance.mjs` — pass.
- [x] 4.4 `node scripts/openspec-check.mjs` and
      `openspec validate --changes --strict` — pass.
- [x] 4.5 `npm run format` and `format:check` — clean.

## Evidence

- RED: the new test failed because the next queue had no `demonchange` step.
- GREEN: the same test passes; `npm test` reports 649 pass.
- GREEN: `node scripts/check-acceptance.mjs` passes with 72 matrix roles.
- GREEN: OpenSpec validation passes.

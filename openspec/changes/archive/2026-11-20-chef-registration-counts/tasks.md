# Tasks

## 1. Evidence

- [x] 1.1 Read Chef r2510 (Summary, How to Run, Examples) and Recluse r3007
      (Summary) from the pinned local snapshots.
- [x] 1.2 Reproduced the gap: with the pinned seat arrangement `chefCount`
      returns 0 without an override and 2 with `{ recluse: "evil" }`; 1 was
      unreachable.
- [x] 1.3 Recorded RED:
      `node --test --test-name-pattern="Chef offers the count" src/core/engine/engine.test.ts`
      failed at `needsChoice === true` (`false !== true`).

## 2. Implementation

- [x] 2.1 Add `chefRegistrationRange` in `src/core/engine/information.ts`:
      a pair can contribute 1 when both players can register evil, and can
      contribute 0 unless both are unable to register good.
- [x] 2.2 The Chef branch offers `uniqueNumbers(min, max)` and requires an
      answer when `min < max`; the impaired branch is unchanged.
- [x] 2.3 RED → GREEN: the pinned arrangement offers `[0, 1, 2]`, accepts 1 and
      rejects 3; a Chef with no registrant needs no answer.
- [x] 2.4 Existing Chef completions in `host-choice.test.ts` and
      `table.test.ts` supply the host's count.

## 3. Evidence surfaces

- [x] 3.1 `src/core/roles/chef/rule.md` declares `TB-CHEF-02` as `host-choice`
      with pinned r2510 and the asserting test.
- [x] 3.2 `docs/rules-matrix.md` gains a Chef `Registration` row with the same
      pin, behavior, host decision and test.
- [x] 3.3 The Chef verified row names the new host decision.

## 4. Verification

- [x] 4.1 `npm test` — 650 pass, 0 fail.
- [x] 4.2 `npm run typecheck` — pass.
- [x] 4.3 `node scripts/check-acceptance.mjs` — pass.
- [x] 4.4 `node scripts/openspec-check.mjs` and
      `openspec validate --changes --strict` — pass.
- [x] 4.5 `npm run format` and `format:check` — clean.

## Evidence

- RED: `node --test --test-name-pattern="Chef offers the count" src/core/engine/engine.test.ts`
  → 1 failed: `needsChoice` false where the pinned per-pair registration needs a
  host answer.
- GREEN: the same command → 2 pass (`the Chef offers the count…`,
  `the Chef needs no registration answer…`).
- GREEN: `npm test` → 650 pass.
- GREEN: `npm run typecheck` → all four programs pass.
- GREEN: `node scripts/check-acceptance.mjs` → 72 matrix roles, 13 test files.

# Tasks

## 1. Evidence

- [x] 1.1 Read Pit-Hag r2998 from the pinned local snapshot.
- [x] 1.2 Reproduced the gap: a fresh Pit-Hag step declared `canKill: true`,
      and `recordSvOutcome` killed a player after a no-op character choice.
- [x] 1.3 Recorded RED: the new test expected `ok: false` and received
      `ok: true`.

## 2. Implementation

- [x] 2.1 `roles/pithag/role.ts` declares no death control on the step.
- [x] 2.2 `recordSvOutcome` rejects a recorded death on a step without
      `canKill`.
- [x] 2.3 `command-versions.ts` keeps an earlier recorded Pit-Hag death and
      bumps `RULESET_VERSION` to `tb-bmr-snv-2026-11-17.4`.
- [x] 2.4 RED → GREEN on both new tests.

## 3. Evidence surfaces

- [x] 3.1 `roles/pithag/rule.md` cites both new tests.
- [x] 3.2 `docs/rules-matrix.md` states the conditional death control.

## 4. Verification

- [x] 4.1 `npm test` — 1197 pass, 0 fail.
- [x] 4.2 `npm run verify` — pass.
- [x] 4.3 `node scripts/check-acceptance.ts` — pass.
- [x] 4.4 `node scripts/openspec-check.ts` and
      `openspec validate --changes --strict` — pass.
- [x] 4.5 `node scripts/browser-check.ts` — the full night/day, table and phone
      acceptance suite passes at 390 px; the death control renders only when
      the step declares `canKill`, which the unit test now pins to false.
- [x] 4.6 Add a Pit-Hag-specific browser scenario to the check suite:
      `PG_BROWSER_CHECK=pithag-deaths` drives `/table`, drafts an in-play
      character (no death control, `error.51`), then a not-in-play Demon, marks
      the death, confirms, and checks the state, journal replay, undo and redo.

## Evidence

- RED: the fresh step reported `canKill: true`, and the in-play outcome
  returned `ok: true` with the player dead.
- GREEN: `node --test --test-name-pattern="Pit-Hag" src/core/engine/snv.test.ts
  src/core/roles/pithag/role.test.ts` reports 15 pass.
- RED (`2026-11-20`): `PG_BROWSER_CHECK=pithag-deaths` failed with `0 !== 1`
  for the death control after drafting `nodashii`.
- GREEN (`2026-11-20`): the same browser check passes: role `nodashii`, player
  2 dead, journal replay identical, undo restores both seats, redo reapplies.

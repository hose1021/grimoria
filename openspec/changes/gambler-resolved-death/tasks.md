# Tasks

## 1. Evidence

- [x] 1.1 Read Gambler r3073 from the pinned local snapshot.
- [x] 1.2 Reproduced the gap: the Gambler step declared `canKill: true` and
      `recordBmrOutcome` accepted the guessed player's death.
- [x] 1.3 Recorded RED: the new test expected `ok: false` and received
      `ok: true`.

## 2. Implementation

- [x] 2.1 `roles/gambler/role.ts` declares `canKill: false`.
- [x] 2.2 `recordBmrOutcome` rejects any recorded death on a step without
      `canKill`, except the Tinker's Storyteller decision.
- [x] 2.3 RED → GREEN on the new test.

## 3. Evidence surfaces

- [x] 3.1 `roles/gambler/rule.md` declares `BMR-GAMBLER-02`.
- [x] 3.2 `docs/rules-matrix.md` gains a `Death resolution` row.

## 4. Verification

- [x] 4.1 `npm test` — 649 pass.
- [x] 4.2 `npm run typecheck` — pass.
- [x] 4.3 `node scripts/check-acceptance.mjs` — pass.
- [x] 4.4 OpenSpec checks — pass.
- [x] 4.5 `npm run format` — clean.
- [x] 4.6 `node scripts/browser-check.mjs` — the Gambler sheet asserts the guess
      section and no death-marking section.

## Evidence

- RED: `node --test --test-name-pattern="cannot record the guessed"` failed with
  `result.ok === true`.
- GREEN: the same command passes; `npm test` reports 649 pass.

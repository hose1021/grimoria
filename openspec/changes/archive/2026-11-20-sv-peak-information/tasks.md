# Tasks

## 1. Evidence

- [x] 1.1 Read Flowergirl r2907 and Juggler r2401 from the pinned local
      snapshots.
- [x] 1.2 Reproduced both gaps by direct engine execution: a role change after
      the event flipped the answer.
- [x] 1.3 Recorded RED with the engine changes stashed: all three new tests
      failed.

## 2. Implementation

- [x] 2.1 `Nomination` gains optional `demonVoters` and `minionNomination`.
- [x] 2.2 `recordVotes` and `nominate` write the event-time facts.
- [x] 2.3 `Juggler` gains an optional `correct` count, written when guesses are
      recorded.
- [x] 2.4 `svInfoForStep` reads the snapshot with a legacy fallback.
- [x] 2.5 RED → GREEN on all three tests.

## 3. Evidence surfaces

- [x] 3.1 `roles/flowergirl/rule.md` and `roles/juggler/rule.md` declare the
      new IDs.
- [x] 3.2 `docs/rules-matrix.md` gains the event-time rows.

## 4. Verification

- [x] 4.1 `npm test` — 651 pass.
- [x] 4.2 `npm run typecheck` — pass.
- [x] 4.3 `node scripts/check-acceptance.mjs` — pass.
- [x] 4.4 OpenSpec checks — pass.
- [x] 4.5 `npm run format` — clean.

## Evidence

- RED: with the engine changes stashed, `node --test --test-name-pattern="Flowergirl detects|Flowergirl ignores|Juggler's answer counts the guesses from" src/core/engine/snv.test.ts` failed 3 of 3.
- GREEN: with the engine changes restored, the same command passed 3 of 3; `npm test` reported 651 pass.

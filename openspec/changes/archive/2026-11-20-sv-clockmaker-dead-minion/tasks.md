# Tasks

## 1. Evidence

- [x] 1.1 Read Clockmaker r2967 and the Glossary "In play" entry from the pinned
      local snapshots.
- [x] 1.2 Reproduced the gap: a dead Minion in play was ignored.
- [x] 1.3 Recorded RED: the new test failed.

## 2. Implementation

- [x] 2.1 The Minion list uses `orderedPlayers`, not `livingPlayers`.
- [x] 2.2 RED → GREEN on the new test.

## 3. Evidence surfaces

- [x] 3.1 `roles/clockmaker/rule.md` declares `SNV-CLOCKMAKER-03`.
- [x] 3.2 `docs/rules-matrix.md` gains the "In play" row.

## 4. Verification

- [x] 4.1 `npm test` — 650 pass.
- [x] 4.2 `npm run typecheck` — pass.
- [x] 4.3 `node scripts/check-acceptance.mjs` — pass.
- [x] 4.4 OpenSpec checks — pass.
- [x] 4.5 `npm run format` — clean.

## Evidence

- RED: `node --test --test-name-pattern="Clockmaker counts a Minion who is dead" src/core/engine/snv.test.ts` failed.
- GREEN: the same command passed; `npm test` reported 650 pass.

# Tasks

## 1. Evidence

- [x] 1.1 Read Chambermaid r2966, Minstrel r2600 and Moonchild r1783 from the
      pinned local snapshots.
- [x] 1.2 Reproduced all three gaps by direct engine execution.
- [x] 1.3 Recorded RED: all three new or extended tests failed.

## 2. Implementation

- [x] 2.1 The Chambermaid wake counts `registersAlive` players.
- [x] 2.2 The Minstrel drunk reaches every other player.
- [x] 2.3 Resurrection clears the Moonchild choice flags.
- [x] 2.4 RED → GREEN on all three tests.

## 3. Evidence surfaces

- [x] 3.1 `roles/chambermaid/rule.md` declares `BMR-CHAMBERMAID-05`.
- [x] 3.2 `roles/moonchild/rule.md` declares `BMR-MOONCHILD-03`.
- [x] 3.3 `docs/rules-matrix.md` records all three behaviors.

## 4. Verification

- [x] 4.1 `npm test` — 650 pass.
- [x] 4.2 `npm run typecheck` — pass.
- [x] 4.3 `node scripts/check-acceptance.mjs` — pass.
- [x] 4.4 OpenSpec checks — pass.
- [x] 4.5 `npm run format` — clean.

## Evidence

- RED: `node --test --test-name-pattern="Chambermaid does not wake without|Minion execution makes everyone|regurgitated Moonchild" src/core/engine/bmr.test.ts` failed 3 of 3.
- GREEN: the same command passed 3 of 3; `npm test` reported 650 pass.

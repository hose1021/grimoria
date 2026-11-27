# Tasks

## 1. Evidence

- [x] 1.1 Read Evil Twin r3101 from the pinned local snapshot.
- [x] 1.2 Reproduced the wrong pairing: a good player turned into the Evil Twin
      was paired with another good player.
- [x] 1.3 Updated the existing Pit-Hag test to the pinned expectation and added
      the symmetric evil-holder case.

## 2. Implementation

- [x] 2.1 Pair creation uses the holder's real alignment.
- [x] 2.2 The stored ids always name the good and the evil side.
- [x] 2.3 RED → GREEN on both pairing cases.

## 3. Evidence surfaces

- [x] 3.1 `roles/eviltwin/rule.md` declares `SNV-EVILTWIN-03`.
- [x] 3.2 `docs/rules-matrix.md` records the character-change pairing.

## 4. Verification

- [x] 4.1 `npm test` — 649 pass.
- [x] 4.2 `npm run typecheck` — pass.
- [x] 4.3 `node scripts/check-acceptance.mjs` — pass.
- [x] 4.4 OpenSpec checks — pass.
- [x] 4.5 `npm run format` — clean.

## Evidence

- RED: the updated Pit-Hag test failed on the old pairing.
- GREEN: both pairing tests pass; `npm test` reported 649 pass.

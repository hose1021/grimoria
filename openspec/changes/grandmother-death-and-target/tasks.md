# Tasks

## 1. Evidence

- [x] 1.1 Read Grandmother r2978 (Summary, How to Run, Examples) from the
      pinned local snapshot.
- [x] 1.2 Reproduced both gaps: an evil target was stored, and the Grandmother
      stayed alive after the Demon killed the grandchild.
- [x] 1.3 Recorded RED for both new assertions.

## 2. Implementation

- [x] 2.1 The first-night branch rejects a target that is not a real good
      Townsfolk or Outsider with `error.grandchild`.
- [x] 2.2 `appendBmrConditionalSteps` kills the Grandmother through `kill()`
      when the Demon killed the grandchild.
- [x] 2.3 The death step declares `canKill: false`.
- [x] 2.4 `error.69` is translated in `en`, `ru` and `az`.
- [x] 2.5 RED → GREEN on both tests.

## 3. Evidence surfaces

- [x] 3.1 `roles/grandmother/rule.md` gains `BMR-GRANDMOTHER-02`.
- [x] 3.2 `docs/rules-matrix.md` records the resolved death and the target
      legality.

## 4. Verification

- [x] 4.1 `npm test` — 649 pass.
- [x] 4.2 `npm run typecheck` — pass.
- [x] 4.3 `node scripts/check-acceptance.mjs` — pass.
- [x] 4.4 OpenSpec checks — pass.
- [x] 4.5 `npm run format` — clean.

## Evidence

- RED: `node --test --test-name-pattern="Grandmother cannot choose|Grandmother stores"`
  → 2 failed: evil target accepted, Grandmother alive.
- GREEN: the same command → 2 pass; `npm test` reports 649 pass.

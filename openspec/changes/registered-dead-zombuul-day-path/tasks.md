# Tasks

## Evidence

- RED: `node --test --test-name-pattern="registered-dead Zombuul" src/core/engine/bmr.test.ts` — `a registered-dead Zombuul cannot nominate and its vote spends the token (BMR-ZOMBUUL-02)` failed with `true !== false` on `own.ok` (the Zombuul could nominate).
- GREEN: the same command passes; `node --test "src/**/*.test.ts"` passes 1270 tests; `node scripts/check-acceptance.ts` passes.

## Work

- [x] Use `registersAlive` in `nominate` and `recordVotes`.
- [x] Count registered-living players for the execution threshold (four day sites) and the table projection.
- [x] Record `BMR-ZOMBUUL-02` in `src/core/roles/zombuul/rule.md` and `docs/rules-matrix.md` with the r3022 pin and the asserting test.
- [ ] Follow-up in the same issue: the table's nomination picker must not offer a registered-dead nominator.

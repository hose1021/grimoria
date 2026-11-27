# Tasks

## Evidence

- RED: `node --test --test-name-pattern="an executed evil Saint" src/core/engine/tb-audit.test.ts` failed with `actual: 'evil'`, `expected: 'good'`.
- GREEN: the same command passes; the good-Saint and impaired-Saint tests still pass.
- `node --test src/core/engine/tb-audit.test.ts` passes 84 tests.
- `node scripts/check-rule-exceptions.ts` reports zero TB mechanical gaps and 98 covered-but-unmapped rules across the four registers.

## Work

- [x] Add `WinContext.teamOf` and back it with `realTeamOf`.
- [x] Return the executed Saint's opposing team.
- [x] Add the evil-Saint regression and the 18 missing branch tests.
- [x] Map ROLE-FORTUNE-TELLER-004 and re-pin ROLE-DRUNK-005.
- [x] Reclassify the five unmodelled Traveller/Fabled rows and regenerate the readiness matrix.
- [x] Run `npm test`, typecheck, format check, `npm run verify` and the verification gates.

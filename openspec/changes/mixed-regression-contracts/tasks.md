# Tasks

## 1. Pinned rules

- [ ] 1.1 Read Monk r3124, Soldier r3121, Fool r2636, Tea Lady r1777, Sailor
      r1768, Zombuul r3022, Vortox r3017, Evil Twin r3101, Mastermind r2993 and
      Barber r1757. Rules check: compliant.
- [ ] 1.2 Record the mixed-script rule composition in `design.md`.

## 2. Behavior

- [ ] 2.1 Apply the BMR protection rules to every death in a mixed script.
- [ ] 2.2 Check the Monk's generic protection in the S&V death writer.
- [ ] 2.3 Keep the real cause and pass a separate Demon attribution, so the
      Innkeeper and the Devil's Advocate still protect.
- [ ] 2.4 Check the Monk's protection before the Fang Gu jump.
- [ ] 2.5 Apply the S&V and BMR win blocks when the script is mixed.
- [ ] 2.6 Keep the public projection free of the new prevention detail.

## 3. Tests

- [ ] 3.1 `MIXED-PROTECTION-02`: Monk and Soldier survive an S&V Demon.
- [ ] 3.2 `MIXED-PROTECTION-03`: the BMR Fool survives its first S&V Demon attack.
- [ ] 3.3 `MIXED-VICTORY-01`: a living Vortox wins a no-execution day.
- [ ] 3.4 `MIXED-VICTORY-02`: a Mastermind execution arms the extra day.
- [ ] 3.5 `MIXED-TRANSFORM-01`: a Barber swaps a TB and an S&V character.
- [ ] 3.6 `MIXED-PROTECTION-04`: the Innkeeper stops a mixed non-Demon ability.
- [ ] 3.7 `MIXED-PROTECTION-05`: the Devil's Advocate stops a mixed execution.
- [ ] 3.8 `MIXED-PROTECTION-06`: a Monk-protected Outsider blocks the Fang Gu jump.

## 4. Evidence

- RED: `MIXED-PROTECTION-02` failed on the unchanged engine, a direct mixed
  Vortox probe returned no winner, and the Innkeeper/Advocate/Fang Gu
  assertions failed before the cause and jump fixes; the Mastermind extra day
  was unreachable under the edition gate.
- GREEN: `node --test src/core/engine/mixed.test.ts` passes 14/14.
- GREEN: `npm test` passes 1597/1597.
- GREEN: `npm run verify` exits 0.
- GREEN: `openspec validate --changes --strict` and `--specs --strict` pass;
  `node scripts/openspec-check.ts` passes.
- GREEN: `VERIFICATION_BASE_REF=origin/dev node scripts/verification/gates.ts
  --scope=all` 0 findings; `npm run verification:mutation` 10/10.
- GREEN: `/pocket/` build `npm run scenarios` 10/10; Playwright 37/37.

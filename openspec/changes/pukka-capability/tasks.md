# Tasks

## 1. Contract

- [x] 1.1 Add `at` and `pendings` facts to `AbilityContext`; add the five
  delayed-effect intents, the decision note and the decision result.
- [x] 1.2 Let `suppressed` carry suspension intents, a custom note and a result.

## 2. Mechanism

- [x] 2.1 Move `pukkaPendings`, `resolvePukkaDeath`, `resolveSuspendedPukkaDeaths`
  and the two effect constructors to `engine/pukka.ts`.
- [x] 2.2 Apply `poison`, `delay-death`, `suspend-death`, `release-poisons` and
  `resolve-death` in the coordinator, in returned order.
- [x] 2.3 Write the rule note and step result, merging the actual death from a
  resolution.

## 3. Role

- [x] 3.1 Add the Pukka resolver with the healthy, self-target and impaired
  paths; delete the Pukka branch from `completeBmrStep`.
- [x] 3.2 Keep the Exorcist and outcome paths on the shared helper; update the
  `commands.ts` import.
- [x] 3.3 Keep every effect id, field and step result unchanged.

## 4. Evidence

- [x] 4.1 Pure resolver tests for the four paths.
- [x] 4.2 Existing BMR Pukka and Exorcist suites pass unchanged.
- [x] 4.3 The Gambler resolver fixture gains the two new context fields.

## 5. Verification

- [x] 5.1 `npm run verify` and `node --test "scripts/*.test.ts"`.
- [x] 5.2 `node scripts/check-acceptance.ts`, `node scripts/openspec-check.ts`
  and both strict validators.
- [x] 5.3 Record RED/GREEN for the resolver tests and the state equivalence.

## Evidence

- RED: with `RoleEffect` extended but the Pukka resolver absent, the four pure
  resolver tests cannot compile or return the typed intents.
- GREEN: `npm test` passes 623/623, including every existing Pukka and Exorcist
  test and the new module tests.
- GREEN equivalence: a throwaway capture ran a Pukka night, a previous-victim
  resolution, a self-target suspension and an impaired step on the base commit
  and on this branch. After removing only the direct-call timestamps and the
  random log-id suffixes (both random in each version), the canonical state,
  every `pukka` effect id and field, every step result/note, the queue, the
  deaths and the players were identical.
- GREEN: `npm run verify`, `node --test "scripts/*.test.ts"` (90/90),
  `node scripts/openspec-check.ts`, `openspec validate --changes --strict`
  (12/12) and `openspec validate --specs --strict` (24/24) pass.
- Pinned source: `docs/official/wiki/Pukka.r3074.wikitext`.

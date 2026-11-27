# Tasks

## 1. Rules and characterization

- [x] 1.1 Read the pinned Gambler (r3073) and Pukka (r3074) text, the States
      (r1039) text on a drunk or poisoned ability, and the two `rule.md`
      files. Rules check: compliant.
- [x] 1.2 Add six characterization tests to `bmr.test.ts` on the untouched
      modules and commit them first: the queue of three nights with the full
      record of both steps; a Lunatic who is shown the Pukka; the record and
      the effects of the Pukka's first-night step; a drunk Pukka on the first
      night; a Gambler who names no character; the log and the record of a
      wrong guess.

## 2. Roles

- [x] 2.1 Declare the Gambler's step and resolver on a `night-step`
      capability for the nights after the first. Remove its `nightStep` and
      `ability`.
- [x] 2.2 Declare the Pukka's step and resolver on a `night-step` capability
      for every night. Remove its `nightStep` and `ability`.
- [x] 2.3 Reach the resolver through `nightResolverFor` in the role tests,
      and add one test per module for the declared step and its nights, and
      one for the Pukka's first choice.

## 3. Contract

- [x] 3.1 Remove the `ability` field from `RoleModule` and the `RoleAbility`
      type.
- [x] 3.2 Make `nightResolverFor` read the `night-step` capability alone.
- [x] 3.3 Add a compile-time check: a module with an `ability` field is
      rejected.
- [x] 3.4 Update the lookup tests: a module without a `night-step` arm owns no
      resolver, no module keeps the removed field, and the two roles resolve
      from their modules.

## 4. Ledger and documents

- [x] 4.1 Remove the `ability` module fact from `scripts/role-ownership.ts`,
      regenerate `docs/role-ownership.md` (both rows declare
      `capability:night-step` and keep their owner and their engine
      references; the category counts stay 5, 15 and 51) and add a test for
      the two rows.
- [x] 4.2 Update `docs/architecture.md`, `docs/rules-sources.md`, `AGENTS.md`
      and the slice 3 note in ADR 0002.

## 5. Verification

- [x] 5.1 The characterization tests pass unchanged after the move.
- [x] 5.2 A seeded driver plays 200 games per edition through `applyCommand`
      on main and on this change; all 600 state and result digests are equal.
- [x] 5.3 Mutation checks; replay a part of them through the driver.
- [x] 5.4 `npm run verify` passes on Node 24.
- [x] 5.5 `node --test scripts/*.test.ts` passes.
- [x] 5.6 `node scripts/browser-check.ts` and `node scripts/run-scenarios.ts`
      pass; both steps are checked at 390 px with real games.
- [x] 5.7 `node scripts/openspec-check.ts` and
      `openspec validate --changes --strict` / `--specs --strict` pass.

## Evidence

- RED: the role tests (`node --test src/core/roles/gambler/role.test.ts
  src/core/roles/pukka/role.test.ts`), run with the modules of main, reported
  12 tests, 10 passed, 2 failed. The Gambler's module declared its legacy
  step for the first night, where the test expects none. The Pukka's module
  declared no capability, and the lookup returned a new wrapper of the legacy
  field at each call, where the test expects the one resolver of the
  capability.
- RED: the lookup tests (`node --test src/core/roles/night-step.test.ts`), run
  with the lookup and the modules of main, reported 15 tests, 12 passed, 3
  failed: "a module without a night-step arm owns no resolver", "no module
  keeps the removed resolver field" and "the migrated Bad Moon Rising roles
  resolve from their modules".
- RED: the ledger test "the Gambler and the Pukka declare their resolver on
  the night-step capability" failed on main (15 tests, 14 passed, 1 failed).
- RED: the compile-time check failed on main: `tsc -p tsconfig.test.json`
  reported `ability.test-d.ts(77,3): error TS2578: Unused '@ts-expect-error'
  directive`, because the contract of main accepts the field.
- GREEN: the same role and lookup tests report 27 tests, 27 passed after the
  move, the ledger tests 15 passed, and `npm run typecheck` passes.
- GREEN: the six characterization tests passed on the untouched modules (1009
  tests, main 1003 plus 6) and pass unchanged after the move; the diff of
  `bmr.test.ts` since their commit is empty. The 127 tests the file had on
  main are untouched: its diff against main is 276 added lines and no removed
  line.
- GREEN: `npm test` reports 1012 tests, 1012 passed, 0 failed.
- GREEN: the seeded driver reported the same digest for 600 games on main
  `508e3d5` and on this change, and the same counters. 9,834 night step
  commands were sent: 8,700 accepted, 796 rejected and 338 that asked the
  Storyteller. 763 outcome commands were sent: 404 accepted and 359 rejected.
  The 200 Bad Moon Rising games sent 9,644 commands.
  - The Gambler: 333 steps, all on a later night and all accepted; no queue
    of a first night held one. 181 Gamblers were healthy, 139 drunk or
    poisoned, and 13 were made drunk by the Goon at the step. 137 guesses
    were right (72 by a healthy Gambler), 162 wrong (92 by a healthy
    Gambler) and 34 steps named no character (17 by a healthy Gambler). Of
    the 92 healthy Gamblers who guessed wrong, 75 died and 17 lived: the
    shared death path prevented the death, 13 times for the Innkeeper's
    protection and 4 times for the Tea Lady's. 27 Gamblers chose themselves.
    181 steps stored `note.finished` and 152 `note.abilityFailed`. All 171
    outcome commands sent for a Gambler step were rejected (164 `error.51`, 6
    `error.52`, 1 `error.6`).
  - The Pukka: 406 steps, 128 on a first night and 278 on a later one. 403
    were accepted and 3 rejected (see the finding in `design.md`). 210
    poisoned a player and 193 stored the note of a suspended ability. 47
    resolved the previous death with a death and 17 without one. 42 steps
    stored the result of a self-target, 20 carried the Goon's drunkenness and
    56 the note of the Lunatic's report. 45 more Pukka steps were closed by
    the Exorcist.
    All 206 outcome commands sent for a Pukka step were accepted and changed
    nothing.
  - A Lunatic was shown the Pukka in 182 steps. The Courtier named the
    Gambler 37 times and the Pukka 38 times.
  - 562 journals replayed to the same state. In 38 more games the driver
    removed a prepared record of another role from the state directly, which
    no command does; those games are counted apart, the same on both sides.
- GREEN: mutation checks show the proof reads the right facts. Forty-one
  single changes were made and reverted. Forty fail at least one test.
  - The Gambler's module: a step declared for every night failed 3 tests, for
    the first night only 15, a step that may record a death 5, a Gambler who
    cannot choose themself 3, another note key 2, an impaired Gambler who
    still gambles 2, a right guess that kills 7, a wrong guess that kills the
    chosen player 5, an unknown seat read as a wrong guess 1, no named
    character read as a wrong guess 2, and no resolver 11.
  - The Pukka's module: a step for the later nights only failed 28, for the
    first night only 26, a Pukka that cannot choose itself 5, another note
    key 3, a step that may record a death 6, a death due the same night 7, an
    impaired Pukka that suspends a death already waiting for its recovery 1,
    an impaired Pukka that still poisons 4, a self-target that releases no
    poison 1, the previous death resolved before the new poison 4, the
    previous death not resolved 13, an impaired Pukka without its own note
    2, and no resolver 27.
  - The lookup: the resolver of the later nights read on the first night
    failed 7, the resolver of the first night read on the later nights 80,
    no resolver for any module 178, an arm for every night that is not found
    194, a first-night step read from the later nights 90, a later step read
    from the first night 83, and a module with arms read as a legacy module
    277.
  - The engine paths the two roles use: a declared resolver that is not run
    failed 24, a named character that does not reach the resolver 4, a
    Gambler step without its list of characters 2, an outcome that may add a
    death to the Pukka's step 1, a Demon's step that yields no note for a
    living Lunatic 2, a death without the marker of the edition 2, a step
    that keeps no result of the resolver 1, and a suppressed ability without
    its note 7.
  - The ledger: a capability row read as an engine branch failed 12 script
    tests.
  - One change passes every test and is equivalent on the current registry:
    the Lunatic's step read from the first-night step of its Demon in place
    of the step of the later nights. The Pukka declares one step for every
    night, the Shabaloth and the Zombuul declare no first-night step and the
    Po is built apart, so both lookups give the same step for every Demon of
    the edition.
- GREEN: sixteen of the changes were also replayed through the seeded driver.
  Fourteen changed the 600-game digest: a Gambler declared for the first
  night only in 170 games, an impaired Gambler who still gambles in 98, a
  right guess that kills in 131, a wrong guess that kills the chosen player
  in 80, no named character read as a wrong guess in 17, a Pukka that sleeps
  on the first night in 128, a death due the same night in 113, a self-target
  that releases no poison in 14, the previous death resolved first in 46 or
  not resolved in 46, an arm for every night that is not found in 324 (128
  of them Bad Moon Rising games), a declared resolver that is not run in
  186, a named character that does not reach the resolver in 90, and an
  outcome that may add a death to the Pukka's step in 165. Two left the
  digest the same, as they must. A Gambler declared for every night changes
  no game, because the first-night order of the edition does not list the
  Gambler. The resolver of the later nights read on the first night changes
  no game, because no step is built on a first night for a role that
  declares its resolver for the later nights only. Both fail the contract
  tests above.
- GREEN: `npm run verify` on Node 24 exited 0: typecheck, oxlint, format
  check, 1012 tests, build, fallback, offline, source policy, official
  provenance (82 entries), acceptance (72 matrix roles) and the ownership
  ledger.
- GREEN: `node --test scripts/*.test.ts` reports 119 passed.
- GREEN: `node scripts/browser-check.ts` passed and
  `node scripts/run-scenarios.ts` reported 10/10 scenarios.
- GREEN: at 390 px, five seeded Bad Moon Rising games of eight players went
  through the table controls. The first night has no Gambler step. The
  Pukka's first-night sheet shows "Движок сам накладывает яд и убивает
  прежнюю цель. Выберите новую цель." and no death control; the step stores
  the poisoned player and no death. On the second night the Gambler's sheet
  lists 26 characters and has no death control. A wrong guess kills the
  Gambler and the death names the ability; a right guess kills nobody; with
  no character named the confirm button stays disabled. A Gambler the Sailor
  made drunk guesses wrong and lives, and the step stores the failed-ability
  note. A Pukka made drunk on the first night poisons nobody and stores the
  suspended note. On the second night the Pukka's first victim dies. The
  page had no page error, no failed request and no horizontal overflow.
- GREEN: `node scripts/openspec-check.ts` passed (24 specs, 43 active
  changes); `openspec validate --changes --strict` reported 43 passed and
  `--specs --strict` 24 passed.

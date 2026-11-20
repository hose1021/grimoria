# Tasks

## 1. Rules and characterization

- [x] 1.1 Read Philosopher r2421, Drunk r3165, Slayer r3122, Tinker r1782,
      Virgin r1729 and Moonchild r1783 against the engine. Rules check:
      compliant with the borrowed-ability contract; the printed-role reads were
      defects.
- [x] 1.2 Record RED: the borrowed Slayer was refused, the borrowed Tinker and
      Virgin did nothing, and the console did not offer their forms.

## 2. Engine

- [x] 2.1 Add `hasTrueAbility` beside `hasAbility` in the state model.
- [x] 2.2 Use `hasAbility` in `useSlayer`; use `hasTrueAbility` in
      `tinkerDeath`, `nominate`, `virginTriggers` and `moonchildChoice`.
- [x] 2.3 Make the Moonchild step actor find a real or borrowed holder, never a
      Drunk's shown character.
- [x] 2.4 Use `hasAbility` for the day Juggler tracking.

## 3. Console

- [x] 3.1 Use the same predicate in `dayHelpForms`, the day card, the day
      actions panel, the Slayer panel, the juggler panel, the Moonchild panel
      and the player sheet.

## 4. Tests

- [x] 4.1 Borrowed Slayer kills the Demon and spends the borrowed ability.
- [x] 4.2 Borrowed Tinker dies; borrowed Virgin executes the nominator.
- [x] 4.3 A Drunk's shown Tinker and Virgin do nothing; the shown Slayer may
      attempt without a death.
- [x] 4.4 Moonchild module: a borrowed dead holder resolves; a living or
      resolved holder does not; a Drunk shown the Moonchild has no step.
- [x] 4.5 `dayHelpForms` offers the borrowed forms and hides the Drunk's shown
      Virgin.

## 5. Documents

- [x] 5.1 Cite the tests in the Philosopher and Moonchild rules matrix rows and
      dossiers.
- [x] 5.2 No schema, storage or command payload change.

## 6. Evidence

- RED: the borrowed-ability test failed on the base (`useSlayer` returned `error.29`; `tinkerDeath` returned `error.58`; the Virgin did not trigger).
- GREEN: `node --test --test-name-pattern="borrowed day ability acts"` passes; `node --test src/core/roles/moonchild/role.test.ts` 3 pass; `node --test --test-name-pattern="day-help sheet offers a borrowed ability"` passes.
- GREEN: `npm test` reports 1,304 tests, all passed; `npm run typecheck` passes.

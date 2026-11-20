# Design

## The rule

- Librarian r1721: "You start knowing that 1 of 2 players is a particular
  Outsider. (Or that zero are in play.)"
- Washerwoman r2630: "You start knowing that 1 of 2 players is a particular
  Townsfolk." Investigator r2983: the same with a Minion. Neither has a zero.
- Drunk r3165, "How to Run": "During the game, act as if the Drunk is
  actually this Townsfolk character. [...] If their ability would give them
  information, you can give false information to them if you wish." The false
  information has the form of the shown character's ability, so a Drunk shown
  the Washerwoman or the Investigator is told a character too.

Rules check: compliant. The requested behavior is the printed one. "Not
prepared, ask for setup" is what `secretsErrors` already says about a zero
held under the Washerwoman's or the Investigator's id (`info-washerwoman`,
`info-investigator`, `drunk-info`).

## Where the defect was

1. `preparedInfo` in `src/core/engine/information.ts` wrote the zero record
   for whichever role held `{ zero: true, pair: [] }`: the Outsider sentence
   for a working ability, the four Outsiders and the zero for an impaired
   owner.
2. `src/ui/screens/secrets.tsx` showed a stored zero as the note "Изгоев в
   игре нет" under any of the three roles and hid the character and the two
   players. The zero control itself was offered for the Librarian only, so
   under the other two the host saw the note and nothing to edit.

The record cannot be made at the table: the control is the Librarian's, and
the night start refuses the record. It needs a command sent after the night
began (`setSetupInfo` and `setSetupInfoZero` have no phase gate), an imported
game or an older save.

## Decisions

### The role declares the form, the engine keeps the record

The `prepared` decision gains `readonly orZero?: true`. The Librarian's module
returns it. The engine answers a zero only when the decision carries it.

The alternative was a list of role ids in the engine, which is what the move
to modules removed. A declaration keeps the engine free of role names, and the
sentence about Outsiders, the Outsider options and the question "are zero in
play" stay out of the role: `orZero` is a form of the ability, not a fact of
the game. The type accepts only `true`, and only on `prepared`, so a role can
neither state "zero are not in play" nor attach a zero to a computed answer.

### A zero for another role is a missing answer

The step returns `{ kind: "one-of-two", missing: true, needsChoice: true }`,
the record every incomplete answer already returns, and the completion asks
for setup with `error.44`. A healthy owner, an impaired owner and a Drunk
shown the role are treated alike, and an answer sent with the step does not
stand in for setup. No new error, text or screen state is needed: the table
already shows the warning with the link to the secrets screen.

The other choice, to show an impaired owner a false character from the pair
of the zero, was rejected: a zero holds no pair.

### The commands still store what is sent

`setSetupInfo` and `setSetupInfoZero` are unchanged. They store incomplete
records of every kind (no character, one player); the check is the night
start's and the step's. A role gate on one command would leave the import
and the older save open, and the step has to be right for those anyway.

### Recorded commands keep their answer

Undo and redo replay the journal (`create-game-store.ts`), and a step that
was recorded as allowed must stay allowed, or the whole journal stops with
`journal-dependency`. A saved game in which a Washerwoman's step answered a
zero could then not undo anything.

The repository's contract for this is the ruleset version (`9cd9773`): "New
commands use the current version; recorded commands keep their behavior."
`RULESET_VERSION` becomes `tb-bmr-snv-2026-11-17`. `answersZeroForAnyRole`
is true for `tb-bmr-snv-2026-11-10` and `tb-bmr-snv-2026-11-16`. The version
reaches `preparedInfo` through the ports of the command: `completeStep`
passes them to `infoForStep`, which passes them to `moduleInfoForStep`. A
direct read (the table, the preview) has no version and follows the rule.

The version is part of a command's fingerprint and of its seed, so commands
sent from this version on have new fingerprints and draws. Recorded commands
carry their own version and keep both.

### The secrets screen

`zeroShown(roleId, stored)` in `secrets-options.ts` is true for the Librarian
alone. `secrets.tsx` uses it in place of the bare test of the record. Under
the other two roles the editor shows the character and the two players, and
choosing a character replaces the zero through the existing `setSetupInfo`.
No mechanics move into the screen: the helper decides what is shown, the
engine decides what is answered.

## Proof

- **RED first.** The tests were run on main `dad24dc` with only the version
  constants added: 13 failures (12 tests and one file that imports the new
  helper). The focused browser check fails on main at "a Washerwoman step
  that holds a zero cannot be completed".
- **An authentic journal.** `fixtures/legacy-setup-zero-game.json` was written
  by main `dad24dc` through `applyCommand`: 18 commands of
  `tb-bmr-snv-2026-11-16`, a Washerwoman's step that stored the sentence and a
  poisoned Investigator's step for which the host chose the zero. The engine
  test replays it, undoes the last step and applies the recorded command
  again; the store test loads it, continues and undoes.
- **Seeded driver, 200 games per edition.** With every command and read of
  the driver under `tb-bmr-snv-2026-11-16`, main and this change give the same
  600 digests, 86 of them games in which a zero held for the Washerwoman or
  the Investigator reached a step. The 600 games saved by main replay on this
  change to the same result as on main. Under the current version 514 games
  are identical and 86 differ; the first difference in each is a Washerwoman's
  or an Investigator's step that read as a zero on main and reads as not
  prepared here.
- **Mutations.** 22 of 22 are killed by the unit tests; three were also
  played through the driver.
- **Screen.** Seven real games at 390 px, and the focused check in
  `scripts/browser-check.ts`.

## Limitations

- The commands still store a zero for any of the three roles; the night start
  and the step refuse it.
- A completed step that stored the sentence keeps it. Nothing rewrites saved
  steps.
- A poisoned Librarian with a prepared pair is still not offered the zero
  (kept by `tb-setup-information`), and a not-prepared step still labels its
  select "Регистрация". Neither is part of this change.
- This change modifies three requirements added by `tb-setup-information`,
  which is not archived yet, so it must be archived after it.
- The driver leans games toward the defect (a zero written for the Washerwoman
  or the Investigator in a quarter of the Trouble Brewing games). It does not
  play the screens; those are covered by the browser checks.

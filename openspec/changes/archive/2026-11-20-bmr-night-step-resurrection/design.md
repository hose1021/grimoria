# Design

## The rule

- Professor r1775: "Once per game, at night*, choose a dead player: if they
  are a Townsfolk, they are resurrected."
- Shabaloth r1790: "Each night*, choose 2 players: they die. A dead player
  you chose last night might be regurgitated."

Rules check: compliant. These are the only Bad Moon Rising abilities that
bring a dead player back, so a night step of any other role resurrects no
one. Lunatic r3112: "You think you are a Demon, but you are not." A Lunatic
shown the Shabaloth chooses as the Shabaloth would, but has no
regurgitation, because the Shabaloth's ability is not theirs. The
`BMR-PROFESSOR-01` and `BMR-SHABALOTH-01` rows of `docs/rules-matrix.md` and
the two requirements already said that each resurrection follows its own
rule; nothing said what a step of another role does with one.

## Where the defect was

`recordBmrOutcome` (`bmr.ts`) applies a host's deaths and resurrection on a
Bad Moon Rising step, and `completeNightStep` reaches it with `deathIds` and
`resurrectId` after the step completes. When a `resurrectId` came in, it
checked the Professor's rule on the Professor's step and the Shabaloth's on
the Shabaloth's, and on every other step it called `resurrectPlayer` with no
check. Nothing in the engine read the step's `canResurrect`; only the table
did, to decide whether to show the resurrection picker.

## Decisions

### The check reads the step's `canResurrect`

`canResurrect` is what a role declares about its night step: the Professor's
and the Shabaloth's modules set it, and the Exorcist's block keeps it on the
Shabaloth's step so the Demon can still regurgitate. The Lunatic's step
copies only the target and its count from its mask, so it stays without it.
The check therefore names no role: a role that declares `canResurrect` gets
the resurrection, under the role-specific checks that follow it, and the
engine and the table read the same field. The ownership ledger does not
change.

The check is the first thing done with a `resurrectId`, after the death
checks and before any death or resurrection lands, so `completeNightStep`
and a later `recordBmrOutcome` are refused alike and a refused command
leaves the state unchanged. It refuses with `error.51`, the code the outcome
already uses for an outcome that does not match the ability's choice, as
the Professor's and the Shabaloth's own refusals do.

Gating by role name (`professor`, `shabaloth`) was rejected: it gives the
same answer today but leaves the engine and the picker reading two
different things.

### Recorded commands keep their resurrection

Undo and redo replay the journal, and a recorded command that brought a
player back on another step must bring them back again, or the replay would
end in another state and later recorded commands could fail. As for the
earlier fixes, `RULESET_VERSION` becomes `tb-bmr-snv-2026-11-17.3`, and
`resurrectsOnAnyStep` is true for the five older versions
(`tb-bmr-snv-2026-11-10`, `tb-bmr-snv-2026-11-16`, `tb-bmr-snv-2026-11-17`,
`tb-bmr-snv-2026-11-17.1`, `tb-bmr-snv-2026-11-17.2`); the check reads the
version from the ports of its command. A command without a version is the
current one before it reaches the ports, so it gets the check.

### The host's own resurrection stays

`resurrectPlayer`, the command behind the host's correction at night, is not
a step's outcome and carries no ability, so it is not gated here.

## Proof

- **RED first.** The new tests were run on main `f10e1ac` with only the
  version constants and the fixture added: 9 of the 9 new unit tests fail
  because main allows the resurrection. The focused browser check fails on
  main at the engine's preview of a resurrection on the Tinker's step,
  which is allowed.
- **An authentic journal.** `fixtures/legacy-night-resurrection-game.json`
  was written by main `f10e1ac` through `applyCommand`: an eight-player
  game in which the Po kills the Gossip on night 2 and the host brings the
  Gossip back on the Tinker's step, and the Po kills the Chambermaid on
  night 3 and the host brings her back with a later outcome of the Po's own
  step. The engine test replays it, undoes to each of the two commands and
  compares the recorded command with the same command sent now; the store
  test loads the game before the Tinker's step, sends the resurrection,
  which is refused, completes the step without it, and undoes and redoes.
- **Seeded driver.** Every game is played through `applyCommand` with a
  pinned clock. On a Bad Moon Rising step whose ability does not resurrect,
  the driver marks a dead player's resurrection on 15% of the completions
  and sends a later outcome with one after 5% of the completed steps; it
  leans on the Tinker, the Po, the Professor, the Shabaloth and the
  Lunatic.
  - Under `tb-bmr-snv-2026-11-17.2`, `tb-bmr-snv-2026-11-17` and
    `tb-bmr-snv-2026-11-10`, main and this change give the same digests in
    2,100 of 2,100 games. Their Bad Moon Rising games hold 1,325
    resurrections on a step that cannot resurrect (965 completions, 360
    later outcomes), allowed on both.
  - Without those resurrections, under the current version, main with only
    the version constants and this change give the same digests in 600 of
    600 games.
  - The 600 games saved by main replay on this change exactly as on main.
    They hold 349 resurrections on a step that cannot resurrect.
  - Under the current version with those resurrections, main with only the
    version constants against this change: 686 of 900 games are identical.
    The 214 others are all Bad Moon Rising, and in each the first
    difference is a resurrection on a step that cannot resurrect, which
    this change refused with `error.51` (main took 213 and refused one as
    an invariant violation). The new check refused 571 completions and 143
    later outcomes, none on the Professor's or the Shabaloth's step.
- **Mutations.** 12 of 13 engine mutations are killed by the unit tests,
  and the one that removes the check (main's behavior) by the browser check
  too. M10 (the check names the Professor and the Shabaloth instead of
  reading `canResurrect`) is equivalent: today `canResurrect` is set on
  exactly those two roles' steps. Two screen mutations, the picker shown
  on every step and on none, are killed by the browser check.
- **Screen.** The focused check `night-resurrection` in
  `scripts/browser-check.ts` plays the Professor's and the Tinker's steps at
  390 px.

## Limitations

- `resurrectPlayer`, the host's own correction, still brings any dead player
  back at night; it is a host tool, not an ability.
- The table never sends a resurrection on a step that cannot resurrect, so
  the refusal has no screen of its own; a command refused there would show
  the console's existing alert, which renders behind the step sheet.
- The fork's `main` takes this fix with a `CHANGELOG.md` entry under
  `Unreleased` and no version bump, as the earlier fixes did.

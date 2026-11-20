# Design

## The rule

- Tinker r1782: "At any time, you may decide that the Tinker dies." The
  Tinker "cannot die from their ability while protected from death, as
  normal".
- States r1039: "A drunk or poisoned player has no ability."

Rules check: compliant. The death is the Tinker's ability, so it needs the
ability: a drunk or poisoned Tinker does not die from it. The ability names
only the Tinker, so it kills no one else. `BMR-TINKER-01` in
`docs/rules-matrix.md` and the `Tinker death` requirement already said that
an impaired Tinker cannot die this way; the day path held to it, the night
step did not.

## Where the defect was

`recordBmrOutcome` (`bmr.ts`) checks a host's deaths on a Bad Moon Rising
step. It exempts the Tinker's step from the rule that a death must be one of
the chosen players, because the Tinker chooses no one, and it skips the
Tinker in `IMPAIRABLE_DEATH`, the list of abilities whose marked death does
nothing while drunk or poisoned. Nothing else looked at the Tinker, so the
host could mark any player's death there, and a drunk or poisoned Tinker's,
and each was recorded as an ability death with `ability: "tinker"`. The
recorded death even carried `impaired: true`.

## Decisions

### The check sits in the outcome

The check runs in `recordBmrOutcome`, after the shared checks and before any
death lands, so `completeNightStep` with `deathIds` and a later
`recordBmrOutcome` on the step are refused alike, and a refused command
leaves the state unchanged. The step's resolver stays `no-effect`: the
Tinker chooses nothing and the death is the host's decision on the outcome,
as before.

- A death of another player is refused first, with `error.51`, the code the
  outcome already uses for a death that does not match the ability. The
  Tinker's own death beside it is refused with it.
- The Tinker's death while drunk or poisoned is refused with `error.59`, the
  code and the sentence of `tinkerDeath`. Impairment is read at the moment of
  the outcome, as `IMPAIRABLE_DEATH` and `tinkerDeath` read it.

Adding the Tinker to `IMPAIRABLE_DEATH` was rejected: it would refuse with
`error.52`, where the day path refuses the same death with `error.59`, and it
would leave the other players' deaths open.

### Recorded commands keep their deaths

Undo and redo replay the journal, and a recorded command that marked a
drunk Tinker's death, or another player's, must mark it again, or the
replay would end in another state and later recorded commands could fail.
The repository's contract is the ruleset version: new commands use the
current one, recorded commands keep their behavior. `RULESET_VERSION`
becomes `tb-bmr-snv-2026-11-17.2`; `marksAnyDeathOnTinkerStep` is true for
`tb-bmr-snv-2026-11-10`, `tb-bmr-snv-2026-11-16`, `tb-bmr-snv-2026-11-17` and
`tb-bmr-snv-2026-11-17.1`, and the check reads the version from the ports of
its command. A command without a version is the current one before it
reaches the ports, so it gets the check.

## Proof

- **RED first.** The new tests were run on main `e2b8015` with only the
  version constants and the fixture added: 8 of the 8 new unit tests fail
  because main allows the death. The focused browser check fails on main at
  the engine's preview of the drunk Tinker's death, which is allowed.
- **An authentic journal.** `fixtures/legacy-tinker-night-game.json` was
  written by main `e2b8015` through `applyCommand`: an eight-player game in
  which the host marks the Gossip's death on the Tinker's step of night 2,
  the Courtier makes the Tinker drunk on night 3 and the host marks the
  drunk Tinker's death on that night's step. The engine test replays it,
  undoes to each of the two commands and compares the recorded command with
  the same command sent now; the store test loads the game before the
  night 3 step, sends the death, which is refused, marks the Tinker alive,
  and undoes and redoes.
- **Seeded driver.** Every game is played through `applyCommand` with a
  pinned clock. The driver marks the Tinker's death on 40% of the Tinker's
  steps and, for this change, another player's on 30% of those; it leans on
  the Tinker and on the roles that make the Tinker drunk or poisoned.
  - Under `tb-bmr-snv-2026-11-17.1`, `tb-bmr-snv-2026-11-17` and
    `tb-bmr-snv-2026-11-10`, main and this change give the same digests in
    2,100 of 2,100 games. In their Bad Moon Rising games this change, like
    main, allowed 72 completions of the Tinker's step with another player's
    death and 26 with a death while the Tinker was drunk or poisoned.
  - The 600 games saved by main replay on this change exactly as on main.
    On the Tinker's step they hold 8 completions with another player's
    death and 2 with a death while the Tinker was drunk or poisoned.
  - Under the current version, main with only the version constants against
    this change: 869 of 900 games are identical. The 31 others are all Bad
    Moon Rising, and in each the first difference is a Tinker's step that
    main allowed and this change refused: 26 with `error.51`, 5 with
    `error.59`.
- **Mutations.** 8 of 10 are killed by the unit tests, and the two that
  touch the drunk Tinker by the browser check too. M9 (a command without a
  version counts as recorded) is equivalent: `commandVersion` fills in the
  current version before the ports see it. M10 (impairment read from the
  step instead of now) is equivalent through `completeNightStep`, which
  writes `step.impaired` from the same check at the same moment just before
  the outcome; it differs only for a later `recordBmrOutcome` after the
  Tinker's impairment changed that night, which no test plays.
- **Screen.** The focused check `tinker-night` in `scripts/browser-check.ts`
  plays the step at 390 px.

## Limitations

- The rejection of a refused death is the console's existing alert. It
  renders behind the step sheet, dimmed, and can be dismissed only after
  the sheet closes; the sheet already warns that the Tinker is impaired.
  The same holds for every refused step command, so it is not changed here.
- A Tinker's death on the night step keeps `bmr: true` in its Death, where
  the day path writes `bmr: "tinker"`; both carry `ability: "tinker"` and
  `cause: "ability"`. Changing the marker would change what recorded
  commands wrote, so it stays.
- The fork's `main` takes this fix with a `CHANGELOG.md` entry under
  `Unreleased` and no version bump, as the earlier fixes did.

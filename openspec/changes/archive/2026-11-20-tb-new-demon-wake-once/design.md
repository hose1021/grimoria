# Design

## The rule

- Imp r3116, "How to Run": "If the Imp killed themself at night, choose an
  alive Minion and replace their character token with a spare Imp token,
  changing their character to the Imp. Wake the new Imp, show them the YOU ARE
  info token, then show them the Imp token. Put the new Imp to sleep."
- Scarlet Woman r3117, "How to Run": "If the Demon dies and there were five or
  more alive players immediately before the Demon died, replace the Scarlet
  Woman token with a spare Imp token [...] That night, wake the new Imp, show
  them the YOU ARE info token, then show them the Imp token."

Rules check: compliant. Both texts wake the new Demon once, the night it
becomes the Demon; after a night self-kill the choice of the Minion comes
first and the wake follows it. Neither says to wake the new Demon again on a
later night. A succession by day is woken "that night", the next one, which is
what TB-SCARLETWOMAN-02 already does.

## Where the defects were

1. `becomeDemon` (`becoming.ts`) sets `state.night.demonChanged`, and
   `appendConditionalSteps` (`night.ts`) queues the `demonchange` step at the
   Imp's slot plus a half while the flag is set. Nothing cleared the flag
   during the night. `endDay` (`day.ts`) copied it into the next night for the
   daytime succession of `scarletwoman-day-succession`, appended the step and
   cleared it then, so a night change was woken that night and again the next.
2. `chooseDemonHeir` (`death.ts`) made the heir the Demon and cleared the
   pending question but did not call `appendConditionalSteps`. The step was
   queued by the next `finishStep` of the night: the table showed the next
   role first. When the Imp's step was the last of the night, `endNight` was
   allowed at once and the wake came only from the end of the next day.

## Decisions

### The heir choice queues the wake

`chooseDemonHeir` calls `appendConditionalSteps` after `becomeDemon`, the same
call `finishStep` makes after a step. The `demonchange` step then sits after
the Imp's done step and before every open step, so it is the current step, and
`endNight`, which needs every step done or skipped, cannot end the night
before it. The call is idempotent (an existing step is not added twice) and
the Imp step's own deaths were handled when that step ended, so it adds
nothing else. It runs before `checkWin`, as in `finishStep`; the win check
does not read the queue, so the order is not observable (mutation M14).

### The end of day carries only a change that still owes its wake

The flag means "a Demon changed since the last night began". `endDay` keeps it
only when the change still needs its wake:

- last night's queue holds no `demonchange` step: the change was not woken at
  night. That is a change by day, or a heir an older ruleset left unwoken;
- or a Demon died today: a change by day, even after a night that had its own
  wake (a Minion becomes the Imp at night, is executed the next day and the
  Scarlet Woman takes the role).

A death of another team, a death on an earlier day or a death of another phase
does not count (mutations M9 to M11).

Clearing the flag once the wake is queued was rejected. `appendConditionalSteps`
runs after every completed or skipped step, so every recorded step command
would need the version branch, and a game saved by day under an older ruleset
already holds the set flag: its next end of day would still wake the new Demon
again. Reading the flag at the end of day fixes the saved games too, and
touches two commands instead of every step.

### Recorded commands keep their wakes

Undo and redo replay the journal, and a recorded `endDay` that queued the
second wake must queue it again, or a later recorded command that completed it
would fail the replay with `journal-dependency`. The repository's contract is
the ruleset version: new commands use the current one, recorded commands keep
their behavior. `RULESET_VERSION` becomes `tb-bmr-snv-2026-11-17.1`;
`repeatsDemonWake` is true for `tb-bmr-snv-2026-11-10`, `tb-bmr-snv-2026-11-16`
and `tb-bmr-snv-2026-11-17`. Both changed functions read the version from the
ports of their command. A suffix keeps the date of the rule snapshot the
version names and orders after the version of the same day.

## Proof

- **RED first.** The tests were run on main `ef55689` with only the version
  constants added: 11 of the 12 new tests fail. The twelfth, "a named heir an
  older ruleset left unwoken is woken on the next night by a command sent
  now", passes on main and guards the fix: it fails when the end of day stops
  carrying a change that has no wake in last night's queue (mutations M5,
  M8). The focused browser
  check fails on main at "the new Imp is woken next, before the Empath".
- **An authentic journal.** `fixtures/legacy-demon-wake-game.json` was written
  by main `ef55689` through `applyCommand`: a ten-player game whose Imp kills
  itself on night 2, the host names the Poisoner, the wake is queued when the
  Empath's step ends and again by the end of day 2. The engine test replays
  it, undoes to the heir choice and to the end of day 2, and compares the
  recorded commands with the same commands sent now; the store test loads the
  game at dawn of day 2, ends the day and undoes.
- **Seeded driver, 200 games per edition.** With every command under
  `tb-bmr-snv-2026-11-17`, main and this change give the same 600 digests.
  The 600 games saved by main replay on this change exactly as on main. Under
  the current version 537 games are identical and 63 differ, all Trouble
  Brewing and each with a night Demon change. The first difference is the
  heir choice in the 12 games where the host named the heir, and the end of
  the next day in the other 51.
- **Mutations.** 14 of 15 are killed by the unit tests; M14 is equivalent.
- **Screen.** The focused check `demon-wake` in `scripts/browser-check.ts`
  plays the night at 390 px.

## Limitations

- The engine still lets a command complete a later step before an earlier
  one. After a wake completed that way, a second change in the same night
  would not be woken again. The table always works on the first open step, and
  in Trouble Brewing only the Imp kills at night, so this cannot happen from
  the table.
- A custom script that the engine runs on the Bad Moon Rising or Sects &
  Violets path and that holds the Imp queues no `demonchange` step, before and
  after this change (read from the code, not played).
- On a phone the heir question still sits on the next step's sheet: the dock
  shows the next step until the host opens it. That is a table defect with
  its own fix.
- This change adds requirements beside `scarletwoman-day-succession`, which is
  not archived yet; archive that change first.

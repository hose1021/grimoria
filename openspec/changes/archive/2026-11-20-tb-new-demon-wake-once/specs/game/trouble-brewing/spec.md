## ADDED Requirements

### Requirement: The new Demon is woken the night of the change

When a Minion becomes the Demon during the night, that night SHALL hold one
`demonchange` step that wakes the new Demon and shows the YOU ARE token. When
the host names the heir, the step SHALL be queued with the choice, so that it
is the next step of the night and the night cannot end before it is completed
or skipped.

**Source**: [Imp r3116](https://wiki.bloodontheclocktower.com/index.php?title=Imp&oldid=3116) "How to Run": "If the Imp killed themself at night, choose an alive Minion ... Wake the new Imp, show them the YOU ARE info token, then show them the Imp token."; [Scarlet Woman r3117](https://wiki.bloodontheclocktower.com/index.php?title=Scarlet_Woman&oldid=3117) "How to Run": "That night, wake the new Imp ..."; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `scripts/browser-check.ts`

#### Scenario: The host names the heir

- **WHEN** the Imp kills themself, several Minions are alive and the host names one of them
- **THEN** the `demonchange` step is queued at the Imp's slot plus a half and is the current step, before the Empath's

#### Scenario: The Imp's step was the night's last

- **WHEN** the host names the heir and no other step is left that night
- **THEN** the night cannot end until the `demonchange` step is completed

#### Scenario: The table at 390 px

- **WHEN** the host plays night 2 of a ten-player game at 390 px, the Poisoner poisons the Scarlet Woman, the Imp kills themself and the host names the Poisoner from the step sheet
- **THEN** the next step is the new Imp's wake, before the Empath's, and the page has no horizontal overflow

### Requirement: The next day does not wake the new Demon again

Ending the day after a night Demon change SHALL NOT queue the `demonchange`
step again. It SHALL queue it only when a Demon died that day and was
replaced, or when the change of the night before left no `demonchange` step in
that night's queue.

**Source**: [Imp r3116](https://wiki.bloodontheclocktower.com/index.php?title=Imp&oldid=3116) "How to Run": "If the Imp killed themself at night, choose an alive Minion ... Wake the new Imp, show them the YOU ARE info token, then show them the Imp token."; [Scarlet Woman r3117](https://wiki.bloodontheclocktower.com/index.php?title=Scarlet_Woman&oldid=3117) "How to Run": "That night, wake the new Imp ..."; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `scripts/browser-check.ts`

#### Scenario: The only Minion inherits

- **WHEN** a healthy Imp kills themself with one Minion alive, the night's `demonchange` step is completed or skipped, and the next day ends with or without a death that is not a Demon's
- **THEN** the next night holds no `demonchange` step, the new Imp wakes for their own Imp step and the Demon-change flag is cleared

#### Scenario: A named heir

- **WHEN** the host named the heir, the wake was completed and the next day ends
- **THEN** the next night holds no `demonchange` step

#### Scenario: A succession by day after a night change

- **WHEN** a Minion became the Imp at night and was woken, and the next day that Imp is executed and the Scarlet Woman takes the role
- **THEN** the next night holds one `demonchange` step, and the night after holds none

#### Scenario: A Demon who died on an earlier day

- **WHEN** the Scarlet Woman took the role on day 1 and, on night 2, she kills herself and the last Minion becomes the Imp
- **THEN** night 2 holds one `demonchange` step, after the Imp's step, and night 3 holds none

#### Scenario: A heir an older ruleset left unwoken

- **WHEN** a heir was named under the older ruleset after the night's last step, so no `demonchange` step was queued, and the day is ended by a command sent now
- **THEN** the next night wakes the new Imp with a `demonchange` step

#### Scenario: The table at 390 px

- **WHEN** the host has woken the named heir at 390 px, finishes the night and ends day 2 with no execution
- **THEN** night 3 opens on the new Imp's own step with no `demonchange` step

### Requirement: A recorded command keeps the wakes it queued

The correction SHALL apply to commands of the ruleset version
`tb-bmr-snv-2026-11-17.1` and later. A command recorded under
`tb-bmr-snv-2026-11-10`, `tb-bmr-snv-2026-11-16` or `tb-bmr-snv-2026-11-17`
SHALL keep the wakes it queued: a recorded heir choice queues none, and a
recorded end of day carries the flag of a night change into the next night, so
that a saved journal replays and undoes to the game that was saved.

**Source**: [Imp r3116](https://wiki.bloodontheclocktower.com/index.php?title=Imp&oldid=3116); `openspec/specs/game/command-engine/spec.md` "ruleset version"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/application/store/create-game-store.test.ts`

#### Scenario: Historical command replay

- **WHEN** a journal saved under `tb-bmr-snv-2026-11-17`, in which the new Imp was woken on night 2 and again on night 3, is replayed
- **THEN** the replay succeeds and its canonical state equals the saved game, both wakes included

#### Scenario: A command sent now

- **WHEN** that journal is taken back to the heir choice or to the end of day 2 and the same command is sent now
- **THEN** the heir choice queues the wake at once and the end of day queues none, while the recorded commands applied again give the saved game

#### Scenario: Each older version

- **WHEN** an Imp self-kill with a named heir is recorded under each of the three older versions
- **THEN** the recorded heir choice queues no wake, the recorded next step queues it, the recorded end of day queues it again, and the journal replays to the same game

#### Scenario: Undo in an older save

- **WHEN** the host loads that game at dawn of day 2, ends the day and takes it back
- **THEN** the next night holds no second wake, the undo replays the journal and returns the loaded game, and the redo returns the continued one

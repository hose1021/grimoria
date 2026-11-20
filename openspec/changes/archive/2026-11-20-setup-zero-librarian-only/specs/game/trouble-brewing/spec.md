## ADDED Requirements

### Requirement: The zero is the Librarian's answer alone

Only a role whose ability has a zero answer SHALL be answered a zero held in
setup: the Librarian, and a Drunk shown the Librarian. A zero held for the
Washerwoman or the Investigator, real or a Drunk's mask, SHALL be no prepared
answer: the step SHALL be marked as missing, SHALL offer no Outsider and no
zero, and its completion SHALL ask for setup with `error.44`, writing nothing.

**Source**: [Librarian r1721](https://wiki.bloodontheclocktower.com/index.php?title=Librarian&oldid=1721) "(Or that zero are in play.)", [Washerwoman r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630), [Investigator r2983](https://wiki.bloodontheclocktower.com/index.php?title=Investigator&oldid=2983), [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/librarian/role.test.ts`, `src/core/roles/washerwoman/role.test.ts`, `src/core/roles/investigator/role.test.ts`, `scripts/browser-check.ts`

#### Scenario: A zero written for the Washerwoman or the Investigator

- **WHEN** a zero is written for the Washerwoman or the Investigator during the first night and the step of a sober and healthy owner is sent
- **THEN** the command asks for setup with `error.44`, the step stores no sentence about Outsiders, and the game, the journal and the command stream are as they were

#### Scenario: A drunk or poisoned owner

- **WHEN** the owner of that step is poisoned, or is a Drunk shown the role
- **THEN** the step asks for setup the same way and the host is not offered the Outsiders or the zero

#### Scenario: An answer does not stand in for setup

- **WHEN** that step is sent with the zero or with a pair as the host's answer
- **THEN** it is refused the same way

#### Scenario: The host prepares an answer

- **WHEN** the host then prepares a character and two players for that role and sends the step again
- **THEN** the step is completed with that character and those players, and the journal replays to the same game

#### Scenario: The setup check agrees

- **WHEN** the same record is checked before the first night
- **THEN** setup secrets report `info-washerwoman`, `info-investigator` or `drunk-info`, as they did

#### Scenario: The Librarian

- **WHEN** a zero is prepared for a Librarian, a poisoned Librarian or a Drunk shown the Librarian
- **THEN** the step stores the zero, or offers every Outsider and the zero, exactly as before this change

### Requirement: A recorded command keeps the zero it answered

The correction SHALL apply to commands of the ruleset version
`tb-bmr-snv-2026-11-17` and later. A command recorded under
`tb-bmr-snv-2026-11-10` or `tb-bmr-snv-2026-11-16` SHALL keep the answer it
gave to a zero held for any role, so that a saved journal replays and undoes
to the game that was saved. A read outside a command SHALL follow the rule.

**Source**: [Librarian r1721](https://wiki.bloodontheclocktower.com/index.php?title=Librarian&oldid=1721); `openspec/specs/game/command-engine/spec.md` "ruleset version"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/application/store/create-game-store.test.ts`

#### Scenario: Historical command replay

- **WHEN** a journal saved under the previous ruleset, whose Washerwoman and Investigator steps answered a zero, is replayed
- **THEN** the replay succeeds and its canonical state equals the saved game, the stored sentence and the host's chosen zero included

#### Scenario: Undo in an older save

- **WHEN** the host loads that game, completes the next step and takes it back
- **THEN** the undo replays the journal and returns the loaded game, and the redo returns the continued one

#### Scenario: A command sent now

- **WHEN** a recorded step is undone and the same step is sent as a new command
- **THEN** the new command asks for setup, while the recorded command applied again gives the saved game

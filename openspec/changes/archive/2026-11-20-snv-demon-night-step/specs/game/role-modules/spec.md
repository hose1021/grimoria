## ADDED Requirements

### Requirement: The Sects & Violets step completion hands a migrated role to the coordinator

When a Sects & Violets step is completed and the step's role module owns a
resolver for that night, the step completion SHALL run that resolver
through the capability coordinator after the seat's record exists, and
SHALL NOT run an edition branch for the step. A role module without a
resolver SHALL keep the existing completion.

**Source**: `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/snv.test.ts`, `src/core/roles/fanggu/role.test.ts`, `src/core/roles/nodashii/role.test.ts`, `src/core/roles/vigormortis/role.test.ts`, `src/core/roles/vortox/role.test.ts`

#### Scenario: A migrated role

- **WHEN** the step of a Sects & Violets role whose module owns a resolver is completed
- **THEN** the resolver's decision is applied through the coordinator, and the step finishes through the shared path

#### Scenario: A role that has not moved

- **WHEN** the step of a Sects & Violets role without a resolver is completed
- **THEN** its completion is the one it had

### Requirement: The four Sects & Violets Demons declare their step from the second night

The Fang Gu, the No Dashii, the Vigormortis and the Vortox role modules
SHALL each declare their step and their resolver on one `night-step`
capability for the nights after the first, choosing one player who may
die, and SHALL NOT declare a legacy night step. The resolver SHALL change
nothing, healthy or impaired; the host SHALL still mark the death on the
outcome of the step, which SHALL still refuse the kill of a drunk or
poisoned Demon.

**Source**: [Fang Gu r2974](https://wiki.bloodontheclocktower.com/index.php?title=Fang_Gu&oldid=2974); [No Dashii r3158](https://wiki.bloodontheclocktower.com/index.php?title=No_Dashii&oldid=3158); [Vigormortis r3015](https://wiki.bloodontheclocktower.com/index.php?title=Vigormortis&oldid=3015); [Vortox r3017](https://wiki.bloodontheclocktower.com/index.php?title=Vortox&oldid=3017); [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/fanggu/role.test.ts`, `src/core/roles/nodashii/role.test.ts`, `src/core/roles/vigormortis/role.test.ts`, `src/core/roles/vortox/role.test.ts`, `src/core/engine/snv.test.ts`, `scripts/role-ownership.test.ts`

#### Scenario: The first night

- **WHEN** the first night starts with one of the four Demons in play
- **THEN** the queue holds no step for it, and the lookup returns no step and no resolver for that night

#### Scenario: A later night

- **WHEN** a later night starts
- **THEN** the Demon's living holder has a step that takes one player and can kill

#### Scenario: The step is completed

- **WHEN** the Demon's step is completed, sober or drunk or poisoned
- **THEN** no record, effect or death is written by the completion, and the step keeps the shared note and log line

#### Scenario: The host marks the death

- **WHEN** the host marks the chosen player's death on the step's outcome
- **THEN** the player dies by the Demon's ability, as before

#### Scenario: A drunk or poisoned Demon

- **WHEN** the host marks a death on the outcome of a drunk or poisoned Demon's step
- **THEN** the outcome is refused with `error.52` and the state is unchanged

#### Scenario: A new holder

- **WHEN** the Fang Gu jumps into an Outsider, or a Snake Charmer takes the Demon's character
- **THEN** the new holder wakes as that Demon from the next night that lists it

### Requirement: Moving the four Sects & Violets Demons changes no outcome

Moving the Fang Gu's, the No Dashii's, the Vigormortis's and the Vortox's
step to the `night-step` capability SHALL NOT change a night queue, a step
record, an effect with its id and flag, a seat's record, a death, a log
line, a command result or the order of draws from the command ports for
the same starting state and the same commands.

**Source**: `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: The same commands

- **WHEN** the same Demon step and outcome are recorded before and after the move
- **THEN** the step, the effects, the seat's record, the deaths, the log lines and the draws from the command ports are identical

#### Scenario: A journal

- **WHEN** a journal with Sects & Violets Demon steps recorded before the move is replayed after it
- **THEN** the replay ends in the same state

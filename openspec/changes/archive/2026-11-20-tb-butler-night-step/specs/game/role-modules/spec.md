## ADDED Requirements

### Requirement: Butler night capability

The Butler role module SHALL resolve its night choice through the
`night-step` capability on every night. A choice SHALL return the master
record and one dated `butler` effect on the chosen player that expires at the
next dusk. A healthy Butler SHALL return them with the `note.butlerMaster`
rule note; an impaired Butler SHALL return them as a `suppressed` decision.
The Trouble Brewing step completion SHALL keep no Butler branch.

**Source**: [Butler r3120](https://wiki.bloodontheclocktower.com/index.php?title=Butler&oldid=3120), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/butler/role.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: A healthy Butler chooses a master

- **WHEN** a healthy Butler chooses another player on night `n`
- **THEN** the master is recorded on the Butler's seat, the Butler is bound to that master until dusk of night `n + 1`, the step records the target and the note, and one secret log line is written

#### Scenario: A new choice

- **WHEN** the Butler chooses again on the next night
- **THEN** the seat records the new master, the earlier effect is left to expire by its own date, and only the new choice binds the next day's votes

#### Scenario: An impaired Butler

- **WHEN** the Butler is drunk or poisoned when choosing
- **THEN** the master is still recorded on the seat, the effect is kept as a record that never applies, and the step records the shared failure note

#### Scenario: A wasted choice does not bind later

- **WHEN** the Butler chose while impaired and is healthy at the next day's vote
- **THEN** the Butler has no master for that vote and no private warning is recorded

#### Scenario: The Butler's own seat

- **WHEN** the Butler chooses themself
- **THEN** the shared target validation rejects the choice before the resolver runs, and nothing is recorded

#### Scenario: Outcomes do not change

- **WHEN** the same Butler choice is completed before and after the move
- **THEN** the master record, the effect, the step, the log line, the ids, the command events, the order of draws from the command clock and identifier stream, and the command result are identical

### Requirement: Master record intent

The capability contract SHALL expose a `record-master` intent that names the
chosen player. The engine SHALL write that player as the master on the acting
seat, on the `effects` path and on the `suppressed` path alike. The intent
SHALL NOT name the seat it is written on.

**Source**: [Butler r3120](https://wiki.bloodontheclocktower.com/index.php?title=Butler&oldid=3120); `docs/adr/0002-engine-contracts.md` §2; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: The record is written on the acting seat

- **WHEN** a resolver returns a `record-master` intent
- **THEN** the acting seat's master is the named player, and the command reports the change as one master-changed event

#### Scenario: The ability failed

- **WHEN** the intent is returned by a `suppressed` decision
- **THEN** the master is recorded as on the working path

#### Scenario: Another seat

- **WHEN** a role names a seat to write the record on
- **THEN** the type check rejects the module

### Requirement: A suppressed dated effect is kept as a record

When a `suppressed` decision returns a `timed-effect` intent, the engine SHALL
add the effect with the same id scheme and the same draw from the identifier
stream of the command, SHALL mark it inactive so that it never applies, and
SHALL NOT end an earlier effect on its behalf. A role SHALL NOT be able to
choose whether a dated effect applies.

**Source**: [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039) (an ability used while drunk or poisoned is wasted, with no effect now or later); `docs/adr/0002-engine-contracts.md` §3; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/bmr.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: The record never applies

- **WHEN** a suppressed decision returns a dated effect
- **THEN** the effect is stored inactive, and it stays inactive after its owner becomes healthy

#### Scenario: Nothing is ended

- **WHEN** the suppressed dated effect asks to replace the previous effect
- **THEN** the earlier effect of that kind from the same source stays as it was

#### Scenario: The id is still drawn

- **WHEN** the record is added inside a command
- **THEN** it draws one identifier from the command stream, as a working effect does, and a replay produces the same id

#### Scenario: A role cannot switch the effect

- **WHEN** a role sets whether its dated effect is active
- **THEN** the type check rejects the module

#### Scenario: Suppressed decisions without a dated effect

- **WHEN** a suppressed decision returns no effect, or only suspension intents
- **THEN** the outcome is the same as before this requirement

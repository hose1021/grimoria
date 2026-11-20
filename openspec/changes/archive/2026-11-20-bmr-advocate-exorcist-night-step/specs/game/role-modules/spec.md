## MODIFIED Requirements

### Requirement: Dated effect intent

The capability contract SHALL expose a `timed-effect` intent that names an
effect kind from a closed set, the affected player and the moment the effect
expires, and MAY ask to replace the earlier effect of the same kind that the
same ability gave. The set SHALL include a drunk effect, a `safe` effect
for a player who cannot die tonight from any ability, and a
`survives-execution` effect for a player who does not die if executed the
next day. The engine SHALL store `safe` as the protection the death path
reads for the Innkeeper, and `survives-execution` as the protection the
execution check reads for the Devil's Advocate, with the day it covers. An
effect the Goon put on its chooser SHALL NOT count as given by the chooser's
ability. The engine SHALL apply it through the effect graph: it SHALL
stamp the acting seat as the source and the current night as the start, and
SHALL take the effect id from the identifier stream of the command.

**Source**: `docs/adr/0002-engine-contracts.md` §2 and §3; [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); [Innkeeper r3160](https://wiki.bloodontheclocktower.com/index.php?title=Innkeeper&oldid=3160); [Devil's Advocate r2594](https://wiki.bloodontheclocktower.com/index.php?title=Devil%27s_Advocate&oldid=2594); [Goon r2977](https://wiki.bloodontheclocktower.com/index.php?title=Goon&oldid=2977); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/bmr.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: The effect record

- **WHEN** a resolver returns a `timed-effect` intent
- **THEN** the engine adds one active effect of that kind with the acting seat as source, the named player as target, the current night as start and the named expiry

#### Scenario: The id comes from the command

- **WHEN** the intent is applied inside a command
- **THEN** the effect id uses the identifier stream of that command, and a replay of the command produces the same id

#### Scenario: Replacement

- **WHEN** the intent asks to replace the previous effect
- **THEN** every earlier effect of the same kind that the same ability gave becomes inactive, and an effect of that kind from another source is left as it is

#### Scenario: Closed kinds

- **WHEN** a resolver names an effect kind outside the set
- **THEN** the type check rejects the module

#### Scenario: Safe tonight

- **WHEN** a resolver returns a `safe` effect for a player
- **THEN** the engine stores the Innkeeper's protection for that player, and the death path prevents a death by any ability tonight as before

#### Scenario: Survives tomorrow's execution

- **WHEN** a resolver returns a `survives-execution` effect for a player on night N
- **THEN** the engine stores the Devil's Advocate's protection for that player with day N after the start
- **AND** the execution check keeps that player alive if executed on day N, and on no other day and for no other cause

#### Scenario: The Goon's drunkenness

- **WHEN** the Goon made its chooser drunk and the chooser's ability ends or replaces its own drunk effects
- **THEN** the Goon's effect stays active

## ADDED Requirements

### Requirement: Choice record intent

The capability contract SHALL expose a `record-choice` intent that names the
player the acting seat chose tonight, or nobody. The engine SHALL write it
on the acting seat as the record of the acting role that the step builder
reads for "different to last night": the player and the night, or no player
and no night. It SHALL write the record on the `effects` path and on the
`suppressed` path alike. The intent SHALL NOT name the record or the seat it
is written on.

**Source**: [Devil's Advocate r2594](https://wiki.bloodontheclocktower.com/index.php?title=Devil%27s_Advocate&oldid=2594); [Exorcist r2973](https://wiki.bloodontheclocktower.com/index.php?title=Exorcist&oldid=2973); `docs/adr/0002-engine-contracts.md` §2; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/bmr.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: The choice is recorded

- **WHEN** a resolver returns a `record-choice` intent for a player on night N
- **THEN** the acting seat's record for its role names that player and night N, and the next night's step bars that player

#### Scenario: The ability failed

- **WHEN** the intent is returned by a `suppressed` decision
- **THEN** the choice is recorded as on the working path

#### Scenario: Nobody chosen

- **WHEN** the intent names nobody
- **THEN** the record names no player and no night, so the next night has no restriction

#### Scenario: Another record or seat

- **WHEN** a role names the record or the seat to write
- **THEN** the type check rejects the module

### Requirement: Demon block intent

The capability contract SHALL expose a `block-demon` intent that names the
seat of the Demon the ability keeps from waking tonight, the note for the
Demon's step and a log line. The engine SHALL keep that Demon's unfinished
step from waking, write the note on it and add the log line as a secret
line. The Demon's other abilities SHALL still resolve.

**Source**: [Exorcist r2973](https://wiki.bloodontheclocktower.com/index.php?title=Exorcist&oldid=2973); [Shabaloth r1790](https://wiki.bloodontheclocktower.com/index.php?title=Shabaloth&oldid=1790); [Pukka r3074](https://wiki.bloodontheclocktower.com/index.php?title=Pukka&oldid=3074); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/bmr.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: The Demon does not wake

- **WHEN** a resolver returns a `block-demon` intent for the Po's seat
- **THEN** the Po's step is finished and skipped with the note the role wrote, and one secret log line with the role's title and detail is added

#### Scenario: The Shabaloth keeps its regurgitation

- **WHEN** the blocked Demon is the Shabaloth
- **THEN** its step stays open with no target and no kill, and may still resurrect

#### Scenario: The Pukka's waiting death

- **WHEN** the blocked Demon is the Pukka and its earlier choice waits to die
- **THEN** that player dies now through the shared death path, and the blocking step's result reports the death

#### Scenario: A finished Demon step

- **WHEN** the Demon's step is already finished
- **THEN** the step is left as it is and only the log line is added

#### Scenario: A block without its note

- **WHEN** a role returns a block without the note, or with a field that changes the Demon's step
- **THEN** the type check rejects the module

### Requirement: The Devil's Advocate declares a step for every night

The Devil's Advocate role module SHALL declare its step and its resolver on
`night-step` capabilities for the first night and for the other nights, and
SHALL NOT declare a legacy night step. Each use SHALL replace the
protection the Devil's Advocate gave before and SHALL record the choice. A
working Devil's Advocate SHALL protect the chosen player from the next
day's execution; a drunk or poisoned one SHALL protect nobody.

**Source**: [Devil's Advocate r2594](https://wiki.bloodontheclocktower.com/index.php?title=Devil%27s_Advocate&oldid=2594); [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/devilsadvocate/role.test.ts`, `src/core/engine/bmr.test.ts`, `scripts/role-ownership.test.ts`

#### Scenario: Every night

- **WHEN** the first and the second night start with a Devil's Advocate in play
- **THEN** the queue holds its step with one player to choose, with the first-night note on the first night and the other note on later nights

#### Scenario: A working choice

- **WHEN** a working Devil's Advocate chooses a player on night N
- **THEN** that player is protected from execution on day N until the next night, the protection from the night before is inactive, and the choice is recorded for night N

#### Scenario: A drunk or poisoned Devil's Advocate

- **WHEN** a drunk or poisoned Devil's Advocate's step is completed
- **THEN** nobody is protected, the step keeps the failure note, the protection from the night before is inactive and the choice is recorded

### Requirement: The Exorcist declares its step from the second night

The Exorcist role module SHALL declare its step and its resolver on one
`night-step` capability for the nights after the first and SHALL NOT
declare a legacy night step. Each use SHALL record the choice. A working
Exorcist who chooses the Demon SHALL keep the Demon from waking tonight and
tell the host who the Demon learns; any other choice SHALL change nothing
else, and a drunk or poisoned Exorcist SHALL stop nobody.

**Source**: [Exorcist r2973](https://wiki.bloodontheclocktower.com/index.php?title=Exorcist&oldid=2973); [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/exorcist/role.test.ts`, `src/core/engine/bmr.test.ts`, `scripts/role-ownership.test.ts`

#### Scenario: The first night

- **WHEN** the first night starts with an Exorcist in play
- **THEN** the queue holds no Exorcist step, and the lookup returns no step and no resolver for that night

#### Scenario: The Exorcist chooses the Demon

- **WHEN** a working Exorcist chooses the Demon
- **THEN** the Demon does not wake tonight, its step names the Exorcist, and the choice is recorded

#### Scenario: Another player

- **WHEN** a working Exorcist chooses a player who is not the Demon
- **THEN** only the choice is recorded, and the Demon still wakes

#### Scenario: A drunk or poisoned Exorcist

- **WHEN** a drunk or poisoned Exorcist chooses the Demon
- **THEN** the Demon still wakes, the step keeps the failure note and the choice is recorded

### Requirement: Moving the Devil's Advocate and the Exorcist changes no outcome

Moving the Devil's Advocate's and the Exorcist's resolution to the
`night-step` capability SHALL NOT change a night queue, a step record, an
effect with its id and flag, a choice record, a death, a log line, a command
result or the order of draws from the command ports for the same starting
state and the same commands.

**Source**: `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/bmr.test.ts`

#### Scenario: The same commands

- **WHEN** the same Devil's Advocate or Exorcist step is completed before and after the move
- **THEN** the step, the Demon's step, the effects, the choice record, the log lines and the draws from the command ports are identical

#### Scenario: A journal

- **WHEN** a journal with Devil's Advocate and Exorcist steps recorded before the move is replayed after it
- **THEN** the replay ends in the same state

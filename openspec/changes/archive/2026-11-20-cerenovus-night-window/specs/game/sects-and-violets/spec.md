## MODIFIED Requirements

### Requirement: Madness state

The engine SHALL store madness as an effect with a source (`cerenovus` or
`mutant`), the mad player, the character the player must be mad about (or the
Outsider requirement for the Mutant), and an expiry, SHALL create one Cerenovus
token for the chosen player and good character at that night step, SHALL keep it
active through the following day and the night after it, SHALL end it at the
next dawn, and SHALL allow the Storyteller to remove it explicitly.

**Source**: [Cerenovus r3048](https://wiki.bloodontheclocktower.com/index.php?title=Cerenovus&oldid=3048)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Chosen player and character

- **WHEN** the Cerenovus step completes with a target and a good character from
  the script
- **THEN** the state stores a madness token with the Cerenovus player as its
  source, the chosen player as its target and the chosen character

#### Scenario: The madness day

- **WHEN** the Cerenovus token is created on night 1
- **THEN** it is active during day 1 and night 2, and inactive from day 2
  onward

#### Scenario: Missing or illegal character

- **WHEN** the Cerenovus step completes without a good character, or with one
  outside the script
- **THEN** no madness token is created and the step keeps its host note

#### Scenario: Explicit removal

- **WHEN** the Storyteller removes the madness effect
- **THEN** the player is no longer under active madness

### Requirement: Madness execution timing

A madness penalty of execution SHALL be recordable during the day or the night,
and a madness execution SHALL not be blocked by, and SHALL not consume, the
day's own execution. A Cerenovus token SHALL be executable during the mad day
and the night that follows it; a token told on the current night SHALL NOT be
executable that night because the player has not had the mad day.

**Source**: [Cerenovus r3048](https://wiki.bloodontheclocktower.com/index.php?title=Cerenovus&oldid=3048), [Mutant r1755](https://wiki.bloodontheclocktower.com/index.php?title=Mutant&oldid=1755)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Broken madness at night

- **WHEN** the host records an execution penalty for a mad player during the
  night
- **THEN** the command is allowed and the player dies

#### Scenario: Cerenovus execution on the following night

- **WHEN** a Cerenovus token was told on night 1 and the host records an
  execution penalty on night 2
- **THEN** the command is allowed and the target dies

#### Scenario: Cerenovus told on the current night

- **WHEN** the Cerenovus token is created on the current night and the host
  tries to execute the target that same night
- **THEN** the command is rejected with `error.73` and the target stays alive

#### Scenario: Mutant first night

- **WHEN** a living Mutant has its standing madness on night 1 and the host
  records an execution penalty
- **THEN** the command is allowed and the Mutant dies

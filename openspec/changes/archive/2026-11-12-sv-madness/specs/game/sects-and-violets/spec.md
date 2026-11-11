# Spec Delta

## ADDED Requirements

### Requirement: Madness state

The engine SHALL store madness as an effect with a source (`cerenovus` or
`mutant`), the mad player, the character the player must be mad about (or the
Outsider requirement for the Mutant), and an expiry, SHALL create one Cerenovus
token for the chosen player and good character at that night step, SHALL keep it
active through the following day, SHALL end it at the next night, and SHALL
allow the Storyteller to remove it explicitly.

**Source**: [Cerenovus r3048](https://wiki.bloodontheclocktower.com/index.php?title=Cerenovus&oldid=3048)
**Tests**: `js/snv.test.mjs`

#### Scenario: Chosen player and character

- **WHEN** the Cerenovus step completes with a target and a good character from
  the script
- **THEN** the state stores a madness token with the Cerenovus player as its
  source, the chosen player as its target and the chosen character

#### Scenario: The madness day

- **WHEN** the Cerenovus token is created on night 1
- **THEN** it is active during day 1 and inactive from night 2 onward

#### Scenario: Missing or illegal character

- **WHEN** the Cerenovus step completes without a good character, or with one
  outside the script
- **THEN** no madness token is created and the step keeps its host note

#### Scenario: Explicit removal

- **WHEN** the Storyteller removes the madness effect
- **THEN** the player is no longer under active madness

### Requirement: Storyteller madness penalty

The engine SHALL apply the madness penalty only through the `madnessPenalty`
command, SHALL accept only the legal penalties `execute` and `none`, SHALL
require a non-empty Storyteller reason, SHALL record and explain the decision
without automating it, SHALL execute the mad player through the normal day
execution path with the `madness` cause when the Storyteller chooses `execute`,
SHALL keep the state unchanged otherwise, and SHALL reject a second decision for
the same token on the same day.

**Source**: [Cerenovus r3048](https://wiki.bloodontheclocktower.com/index.php?title=Cerenovus&oldid=3048), [Mutant r1755](https://wiki.bloodontheclocktower.com/index.php?title=Mutant&oldid=1755)
**Tests**: `js/snv.test.mjs`

#### Scenario: Execution penalty

- **WHEN** the host applies `madnessPenalty` with `execute` and a reason
- **THEN** the mad player is executed for this day, the execution cause is
  `madness`, and the token stores the decision and its reason

#### Scenario: Declined penalty

- **WHEN** the host applies `madnessPenalty` with `none` and a reason
- **THEN** nobody dies, the token stores the decision and its reason, and the
  day continues

#### Scenario: Illegal penalty

- **WHEN** the penalty is not one of the legal options
- **THEN** the command returns a Storyteller choice with `execute` and `none`
  and the state is unchanged

#### Scenario: No active madness or no reason

- **WHEN** the player has no active madness or the reason is empty
- **THEN** the command is rejected and the state is unchanged

### Requirement: Mutant madness

The engine SHALL keep a standing madness token for every living Mutant that
requires the Mutant to be mad about being an Outsider, SHALL create it when the
Mutant enters play through a deal or a character change, SHALL end it when the
player dies or stops being the Mutant, and SHALL use the same Storyteller
penalty command.

**Source**: [Mutant r1755](https://wiki.bloodontheclocktower.com/index.php?title=Mutant&oldid=1755)
**Tests**: `js/snv.test.mjs`

#### Scenario: The Mutant in play

- **WHEN** an Sects and Violets game with a living Mutant builds its first night
- **THEN** a madness token exists with the Mutant as both source and target and
  no character requirement beyond the Outsider one

#### Scenario: Character change

- **WHEN** the Mutant stops being the Mutant
- **THEN** the token is no longer active

#### Scenario: Penalty on the Mutant

- **WHEN** the host applies `madnessPenalty` to the living Mutant
- **THEN** the decision is recorded and executed exactly as for the Cerenovus

### Requirement: Madness stays out of public views

The engine SHALL keep madness data out of `publicGameView`, SHALL keep it out of
the public role view and the player handoff projection, and SHALL expose it only
to the host through the state and its secret log.

**Source**: `openspec/specs/app/ui-and-privacy/spec.md` "Public and player privacy", `openspec/specs/app/store-boundaries/spec.md` "Read models are projections"
**Tests**: `js/snv.test.mjs`, `src/ui/screens/player-projection.test.ts`

#### Scenario: Public projection

- **WHEN** a game holds an active madness token
- **THEN** the serialized public game view contains no madness source, required
  character or target

#### Scenario: Player handoff

- **WHEN** the player handoff projects a seat
- **THEN** it exposes only the seat, name, claim state and shown role

# Spec Delta

## ADDED Requirements

### Requirement: The Goon drinks its first chooser and takes their alignment

The engine SHALL make the first player to choose the Goon each night drunk
before their ability resolves, SHALL prevent that ability from applying an
effect, SHALL keep the drunk until the next dusk, and SHALL set the Goon's
alignment to that player's alignment. A chooser that puts a poison or drunk on
the Goon SHALL leave the effect graph acyclic. When the Assassin chooses the
Goon, the Goon SHALL die and still turn evil; the Moonchild's stored choice
SHALL still resolve.

**Source**: [Goon r2977](https://wiki.bloodontheclocktower.com/index.php?title=Goon&oldid=2977)
**Tests**: `js/bmr.test.mjs`

#### Scenario: First chooser

- **WHEN** a player chooses the healthy Goon with their ability and no earlier player chose them that night
- **THEN** that player is drunk immediately, their ability does not work, the Goon takes their alignment, and no later chooser in the same night changes either result

#### Scenario: Until dusk

- **WHEN** the next dusk arrives
- **THEN** the granted drunk has expired

#### Scenario: Impaired Goon

- **WHEN** the Goon is drunk or poisoned when chosen
- **THEN** the chooser is not drunk and the Goon's alignment does not change

#### Scenario: Already impaired chooser

- **WHEN** the chooser was already drunk or poisoned when they chose the Goon
- **THEN** the Goon still changes alignment and the chooser is still drunk

#### Scenario: Not an ability choice

- **WHEN** the Lunatic's simulated choice or the Grandmother's Storyteller pick targets the Goon
- **THEN** the Goon grants nothing

#### Scenario: A chooser that impairs the Goon

- **WHEN** a Pukka, Sailor or Innkeeper chooses the Goon
- **THEN** the command is accepted, the effect graph stays acyclic and the chooser's own poison, drunk or protection does not apply

#### Scenario: Impaired outcome

- **WHEN** the Goon-impaired step's outcome is recorded
- **THEN** no death or resurrection is applied

#### Scenario: Assassin exception

- **WHEN** the Assassin chooses the Goon
- **THEN** the Goon dies, still turns evil, and the Assassin outcome is not rejected

#### Scenario: Moonchild bookkeeping

- **WHEN** a dead Moonchild's stored choice targets the Goon
- **THEN** the Goon still dies

### Requirement: The Lunatic wears a Demon mask and the real Demon learns its choice

The engine SHALL store the shown Demon for the Lunatic without making the
player evil, SHALL name the Lunatic in the night-one Demon information when a
Demon information step exists, SHALL report the Lunatic's name and last choice
on every Demon role step while the Lunatic is in play, and SHALL record the
Lunatic's choice without causing a death.

**Source**: [Lunatic r3112](https://wiki.bloodontheclocktower.com/index.php?title=Lunatic&oldid=3112)
**Tests**: `js/bmr.test.mjs`

#### Scenario: Mask

- **WHEN** the Lunatic is in play
- **THEN** the player's shown role is the stored Demon and the player's alignment stays good

#### Scenario: Demon report

- **WHEN** a Demon role step wakes while a Lunatic is in play
- **THEN** the step information names the Lunatic and the player they chose that night

#### Scenario: No death

- **WHEN** the Lunatic chooses a player
- **THEN** the choice is stored and no one dies

### Requirement: The Mastermind extra day decides by the executed team

The engine SHALL end the Mastermind's extra day by the real alignment of the
executed player: a good player executed on that day loses for good, and an evil
player executed there loses for evil.

**Source**: [Mastermind r2993](https://wiki.bloodontheclocktower.com/index.php?title=Mastermind&oldid=2993)
**Tests**: `js/bmr.test.mjs`

#### Scenario: Good player executed

- **WHEN** a good player is executed on the Mastermind's extra day
- **THEN** evil wins with the `mastermind` reason

#### Scenario: Evil player executed

- **WHEN** an evil player is executed on the Mastermind's extra day
- **THEN** good wins with the `mastermind` reason

### Requirement: The audited roles expose a support status

The engine SHALL expose, for every audited Bad Moon Rising role in play, its
support status (`verified`, `host-choice` or `unsupported`) together with the
detail used by the Storyteller screens; a role outside the audit SHALL NOT be
listed.

**Source**: [Issue #37](https://github.com/hose1021/grimoria/issues/37), `docs/rules-matrix.md` "Status legend"
**Tests**: `js/bmr.test.mjs`

#### Scenario: Audited roles

- **WHEN** the audited roles are in play
- **THEN** the Goon, Lunatic and Mastermind report `verified`, the Tinker and Pacifist report `host-choice`, and each entry names its detail

#### Scenario: Unaudited role

- **WHEN** a role outside the audited set is in play
- **THEN** the support list omits it

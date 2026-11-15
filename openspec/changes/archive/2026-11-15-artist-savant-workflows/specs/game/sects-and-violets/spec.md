# Spec Delta

## ADDED Requirements

### Requirement: Artist private question

The engine SHALL record one Artist question per game through the
`artistQuestion` command, only during an unended day, only for a living player
whose effective character is the Artist or who holds the Artist through the
Philosopher, with a non-empty trimmed question and one answer from `yes`, `no`
or `unknown`, and SHALL NOT interpret the question or compute the answer.

**Source**: [Artist r3156](https://wiki.bloodontheclocktower.com/index.php?title=Artist&oldid=3156); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/snv.test.ts`, `src/application/read-models/table.test.ts`

#### Scenario: First and only question

- **WHEN** a living Artist asks a question during the day
- **THEN** the engine stores the trimmed question, the chosen answer and
  `used.artist`, and the ability is not offered again

#### Scenario: Declined or invalid use

- **WHEN** the question is blank, the player does not hold the Artist ability,
  or the Artist has already asked
- **THEN** the command is rejected and no state changes

#### Scenario: Private answer

- **WHEN** the question and answer are stored
- **THEN** the public projection contains neither, and replay from the journal
  restores the same private record

### Requirement: Savant private statements

The engine SHALL record one Savant visit per day through the `savantVisit`
command, only during an unended day and only for a living player whose effective
character is the Savant or who holds the Savant through the Philosopher, with
two different non-empty trimmed statements and a declared truth pattern. A
healthy Savant with no living unimpaired Vortox SHALL be required to declare
exactly one true statement. The engine SHALL NOT verify whether a statement is
true.

**Source**: [Savant r2910](https://wiki.bloodontheclocktower.com/index.php?title=Savant&oldid=2910); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/snv.test.ts`, `src/application/read-models/table.test.ts`

#### Scenario: One true statement

- **WHEN** a healthy Savant hears two statements and no living unimpaired
  Vortox is in play
- **THEN** the host must declare the first or the second statement true

#### Scenario: Frequency and privacy

- **WHEN** the Savant visits twice on the same day, or the visit is recorded
- **THEN** the second visit is rejected, and the statements stay out of the
  public projection while remaining replayable

### Requirement: Savant impaired and Vortox patterns

While the Savant is impaired the engine SHALL permit one, both or neither
statement to be true. Under a living unimpaired Vortox the engine SHALL permit
only both statements false, because Townsfolk information is false.

**Source**: [Savant r2910](https://wiki.bloodontheclocktower.com/index.php?title=Savant&oldid=2910), [Vortox r3017](https://wiki.bloodontheclocktower.com/index.php?title=Vortox&oldid=3017)
**Tests**: `src/core/engine/snv.test.ts`, `src/application/read-models/table.test.ts`

#### Scenario: Impaired Savant

- **WHEN** the Savant is drunk or poisoned
- **THEN** the host may declare one, both or neither statement true

#### Scenario: Vortox

- **WHEN** a living unimpaired Vortox is in play
- **THEN** only both statements false is accepted

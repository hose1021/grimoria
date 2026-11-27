# Spec Delta

## ADDED Requirements

### Requirement: Abnormal ability marking

The engine SHALL record one ABNORMAL mark per character in the current day and
night through the `recordAbnormal` command, with a required non-empty reason,
only for a living game and a real player. It SHALL reject a second mark for the
same player in the same day and night, and SHALL NOT infer that an ability was
abnormal.

**Source**: [Mathematician r3153](https://wiki.bloodontheclocktower.com/index.php?title=Mathematician&oldid=3153); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Mark and duplicate

- **WHEN** the Storyteller marks a character whose ability worked abnormally
- **THEN** the mark stores the player, the reason and the time, and a second
  mark for the same player in the same window is rejected

#### Scenario: Invalid mark

- **WHEN** the reason is blank, the player is unknown or the game is not in a
  day or night
- **THEN** the command is rejected and no mark is stored

### Requirement: Computed Mathematician count

The Mathematician SHALL learn the number of distinct characters marked since
the last Mathematician wake, SHALL count a working from the preceding day, and
SHALL clear the marks after the step resolves or is skipped.

**Source**: [Mathematician r3153](https://wiki.bloodontheclocktower.com/index.php?title=Mathematician&oldid=3153)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Count and clear

- **WHEN** two characters are marked and the Mathematician wakes that night
- **THEN** the step shows 2 and the marks are removed after it completes

#### Scenario: Mark from the preceding day

- **WHEN** a character is marked during day 1 and the Mathematician wakes on
  night 2
- **THEN** the step counts that character

#### Scenario: Skipped wake

- **WHEN** the Mathematician step is skipped or its actor died
- **THEN** the window closes and the marks do not carry into a later wake

### Requirement: False Mathematician number

When the Mathematician is drunk or poisoned, or a living unimpaired Vortox is in
play, the engine SHALL keep the computed count but SHALL require a host number
from 0 to the player count, and SHALL store the chosen number. Under a living
unimpaired Vortox the true number SHALL NOT be offered or accepted. An impaired
Mathematician without a Vortox MAY receive any number, including the true one.

**Source**: [Mathematician r3153](https://wiki.bloodontheclocktower.com/index.php?title=Mathematician&oldid=3153), [Vortox r3017](https://wiki.bloodontheclocktower.com/index.php?title=Vortox&oldid=3017)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Host number required

- **WHEN** the Mathematician is impaired or a living unimpaired Vortox is in
  play
- **THEN** completing the step without a provided number is rejected and a
  provided option is stored

#### Scenario: Vortox true number

- **WHEN** the Mathematician is healthy and a living unimpaired Vortox is in
  play
- **THEN** the true number is not offered and a command that provides it is
  rejected

# Spec Delta

## MODIFIED Requirements

### Requirement: Target ranges and conditional wakes

The engine SHALL enforce each step's target range, SHALL reject a repeated seat
for every step that takes more than one target with `error.42` before any
mutation, SHALL let the Po choose three targets only after a night with no
choice, SHALL record the Po's choice of no one as a decision, SHALL skip a
chosen Demon's wake for the Exorcist, and SHALL resurrect only a dead Townsfolk
for the Professor.

**Source**: [Po r3104](https://wiki.bloodontheclocktower.com/index.php?title=Po&oldid=3104), [Exorcist r2973](https://wiki.bloodontheclocktower.com/index.php?title=Exorcist&oldid=2973), [Professor r1775](https://wiki.bloodontheclocktower.com/index.php?title=Professor&oldid=1775), [Innkeeper r3160](https://wiki.bloodontheclocktower.com/index.php?title=Innkeeper&oldid=3160), [Shabaloth r1790](https://wiki.bloodontheclocktower.com/index.php?title=Shabaloth&oldid=1790)
**Tests**: `src/core/engine/bmr.test.ts`, `src/core/engine/bmr.test.ts`, `src/core/engine/bmr.test.ts`, `src/core/engine/bmr.test.ts`, `src/core/engine/snv.test.ts`

#### Scenario: Po after an empty night

- **WHEN** the Po chose no target on the previous night
- **THEN** the next Po step requires exactly three targets

#### Scenario: Repeated seat

- **WHEN** a step that takes two or three players receives the same player
  twice
- **THEN** the completion is rejected with `error.42`, the preview is rejected,
  and no character, effect, death or journal entry changes

#### Scenario: Po chooses no one through its own action

- **WHEN** the host uses the console's No one action on the Po's step
- **THEN** the step records `used.poNoOne` and the next Po step takes three targets

#### Scenario: Po's step is not skipped

- **WHEN** the host sends `skipStep` for a living Po
- **THEN** the command is rejected with `error.80` and nothing is recorded

#### Scenario: Exorcist target

- **WHEN** the Exorcist chooses the Demon
- **THEN** the Demon does not wake that night

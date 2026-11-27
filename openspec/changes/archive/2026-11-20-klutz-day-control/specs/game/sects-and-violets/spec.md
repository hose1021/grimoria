# Spec Delta

## MODIFIED Requirements

### Requirement: Klutz public choice

The engine SHALL record the Klutz's public choice at the moment the Klutz learns
of the death: an evil target SHALL lose the game immediately for the Klutz's
team, a good target SHALL not, an impaired Klutz SHALL spend the choice and lose
nothing, and a target who is not alive when the choice is made SHALL be refused
with a typed reason so that the host can name another living player. A choice
already recorded SHALL complete the death-triggered step even if its target dies
beforewards. The console SHALL offer the choice after the death even when the
execution ended the day.

**Source**: [Klutz r1758](https://wiki.bloodontheclocktower.com/index.php?title=Klutz&oldid=1758)
**Tests**: `src/core/engine/snv.test.ts`, `src/ui/screens/table/helpers.test.ts`, `scripts/browser-check.ts`

#### Scenario: Evil target at the death

- **WHEN** an executed Klutz publicly chooses an evil player
- **THEN** the opposing team wins immediately with the `klutz` reason

#### Scenario: Choice after an execution

- **WHEN** the day execution killed the Klutz and ended the day
- **THEN** the day-help sheet still offers the Klutz form and the panel records
  one living player through the command

#### Scenario: Target already dead

- **WHEN** the host tries to record a target who is not alive
- **THEN** the choice is refused with `error.55` and another living player can be
  recorded, so the step is never stranded

#### Scenario: Recorded choice and the queued step

- **WHEN** a choice is recorded while a Klutz step is still queued
- **THEN** that step is completed with the recorded target

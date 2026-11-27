# Spec Delta

## ADDED Requirements

### Requirement: A mandatory living step cannot be skipped

The engine SHALL reject a `skipStep` that targets a living actor's mandatory
night step, SHALL leave the state, the journal and the queue unchanged, and
SHALL keep skipping an optional step, a step without an actor, a dead actor's
step and a death-triggered wake. The console SHALL offer the Skip control only
for a step the engine allows.

**Source**: [Imp r3116](https://wiki.bloodontheclocktower.com/index.php?title=Imp&oldid=3116); [Po r3104](https://wiki.bloodontheclocktower.com/index.php?title=Po&oldid=3104); [Issue #318](https://github.com/hose1021/grimoria/issues/318)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/bmr.test.ts`, `scripts/browser-check.ts`

#### Scenario: A mandatory living step

- **WHEN** the host sends `skipStep` for a living Imp, Exorcist or Pukka
- **THEN** the command is rejected with `error.80` and the step, the queue and
  the journal stay as they were

#### Scenario: An optional step

- **WHEN** the host sends `skipStep` for a living Assassin, Professor or Barber
- **THEN** the step is marked done and skipped and the journal records the skip

#### Scenario: A dead actor or a system step

- **WHEN** the actor has died, or the step belongs to the system wakes
- **THEN** the skip stays allowed and writes the same note and log line as before

#### Scenario: The console

- **WHEN** the open step is a living actor's mandatory step
- **THEN** the dock and the step sheet show no Skip control and the engine still
  refuses the command

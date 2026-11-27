# Spec Delta

## ADDED Requirements

### Requirement: One host action starts a prepared game

The engine SHALL expose a `startGame` command that takes a game which has only
run setup into the first night in one validated action: it SHALL deal the
prepared bag (honouring an explicit assignment), SHALL seal the seat order,
SHALL fill only the setup secrets the engine can derive without a host decision,
and SHALL start night 1. A prepared bag that still needs a host-only secret (the
Drunk's false information) SHALL NOT start and SHALL be reported so the host
records it and retries.

**Source**: [Issue #46](https://github.com/hose1021/grimoria/issues/46), [Issue #19](https://github.com/hose1021/grimoria/issues/19); `AGENTS.md` "Do not auto-fill Storyteller choices"; [Drunk r3051](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3051)
**Tests**: `js/acceptance.test.mjs`, `js/commands.test.mjs`

#### Scenario: Start from a prepared bag

- **WHEN** a game has a legal bag and no dealt roles
- **THEN** `startGame` deals the roles, moves through `seat` and returns a night-1 queue

#### Scenario: Host-only false information

- **WHEN** the Drunk was shown an information role and its false pair is unset
- **THEN** `startGame` does not deal an answer and the start stays rejected until `setSetupInfo` records one

#### Scenario: Already started game

- **WHEN** `startGame` is applied to a night, day or finished game
- **THEN** it is rejected and the state is unchanged

### Requirement: Zero-step acceptance pipeline

A game created from the zero state SHALL reach a finale through the command
surface alone. Every applied command SHALL have validated as `allowed` first,
every target, false-information answer, redirect and Demon heir SHALL come from
the engine's declared options, and the journal SHALL explain every phase, every
completed or skipped night step, every nomination, vote and execution, and the
finale. The path SHALL NOT write the state directly or require a screen.

**Source**: [Issue #46](https://github.com/hose1021/grimoria/issues/46), [Issue #19](https://github.com/hose1021/grimoria/issues/19) "Definition of Done"
**Tests**: `js/acceptance.test.mjs`

#### Scenario: Fixed five-player finale

- **WHEN** a five-player Trouble Brewing bag is started and driven by legal commands
- **THEN** the game ends with a winner and the journal contains a setup, phase, night, nomination, vote, execution and winner entry

#### Scenario: Seeded sample

- **WHEN** the preset Trouble Brewing bags for player counts 5-15 are played with three seeds per count
- **THEN** every game ends with a winner and the same seed reproduces the same game

#### Scenario: No legal completion

- **WHEN** a night step has no legal completion for its declared target mode
- **THEN** the host skips it with the validated `skipStep` command and the journal records the skip

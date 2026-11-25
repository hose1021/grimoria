## ADDED Requirements

### Requirement: Every night choice record

Every completed role night step SHALL record the acting player and the chosen
players on its log line, independent of the localized note. The record SHALL be
written for an attack step and for a step whose ability was suppressed. The
Courtier's step SHALL record the chosen character and the players made drunk.
The console SHALL show the actor and the targets on every line of the side-panel
journal and the game-over chronicle.

**Source**: [Issue #491](https://github.com/hose1021/grimoria/issues/491); `SPEC.md` "State v4"
**Tests**: `src/core/engine/bmr.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/snv.test.ts`, `scripts/browser-check.ts`

#### Scenario: Chosen players

- **WHEN** a Poisoner chooses a player
- **THEN** the completed step's log line names the Poisoner and the chosen player

#### Scenario: Suppressed choice

- **WHEN** a drunk or poisoned role chooses players
- **THEN** the log line still names the actor and the choice, and the note records the failure

#### Scenario: Attack step

- **WHEN** a night step resolves an attack
- **THEN** the log line names the actor and every chosen target

#### Scenario: Courtier character

- **WHEN** the Courtier chooses a character
- **THEN** the log names the character and every player made drunk, or says that no player of that character is in play

#### Scenario: Chronicle line

- **WHEN** the host opens the game-over review
- **THEN** every night line shows the actor and the targets, not only the note

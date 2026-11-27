## ADDED Requirements

### Requirement: Unchosen Lunatic bluffs follow the Demon selection

When the separate Lunatic bluff list is missing or empty, setup and first-night
information SHALL use the host's Demon bluff list. A nonempty separate list
SHALL take precedence and remain independent of later Demon bluff edits.
Reading the default SHALL NOT copy it into stored state or alter journal replay.

**Source**: [Lunatic r3112](https://wiki.bloodontheclocktower.com/index.php?title=Lunatic&oldid=3112), [Issue #256](https://github.com/hose1021/grimoria/issues/256)
**Tests**: `src/core/engine/setup.test.ts`, `scripts/browser-check.ts`

#### Scenario: Fresh empty list

- **WHEN** a new game has three Demon bluffs and no separately chosen Lunatic bluffs
- **THEN** the setup slots, first-night instructions and Lunatic information show those three Demon bluffs

#### Scenario: Later Demon edit before dealing

- **WHEN** the host changes the Demon bluffs while the Lunatic list is empty
- **THEN** the Lunatic default follows the new list without storing an override

#### Scenario: Separate choice

- **WHEN** the host chooses a nonempty separate Lunatic list
- **THEN** it takes precedence, including while partially edited, and survives save/reload independently

#### Scenario: Legacy bag restoration

- **WHEN** the host loads or restores a setup whose separate Lunatic list is missing
- **THEN** the list remains unchosen and follows subsequent Demon bluff edits

#### Scenario: Historical command replay

- **WHEN** a saved journal from the previous command ruleset is replayed or undone
- **THEN** its recorded queue notes, completed-step information and canonical state are preserved while live information reads use the corrected default

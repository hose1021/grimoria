## ADDED Requirements

### Requirement: Deterministic madness execution records

A host-chosen madness execution SHALL use the command's execution context
for its death and execution records. Preview, apply and replay of the same
command SHALL preserve equal state and events without mutating preview input.

**Source**: [Cerenovus r3048](https://wiki.bloodontheclocktower.com/index.php?title=Cerenovus&oldid=3048), [Mutant r1755](https://wiki.bloodontheclocktower.com/index.php?title=Mutant&oldid=1755); issue #212's deterministic execution contract.
**Tests**: `src/core/engine/snv.test.ts`, `scripts/browser-check.ts`

#### Scenario: Preview and replay a madness execution

- **WHEN** the Storyteller executes a player through a valid madness decision
- **THEN** its records use the pinned command time and preview/apply/replay agree

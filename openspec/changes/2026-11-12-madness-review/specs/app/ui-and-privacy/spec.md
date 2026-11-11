## ADDED Requirements

### Requirement: Host reviews active madness before ending the day

The day card SHALL show every active Cerenovus or Mutant madness effect to the Storyteller, describe the condition the player must try to convince the group of, offer the legal review outcomes with a required reason, indicate which reviews remain pending, and show the engine's blocker until all active effects have a decision for that day. Madness data SHALL remain host-only.

**Source**: [Cerenovus r3048](https://wiki.bloodontheclocktower.com/index.php?title=Cerenovus&oldid=3048), [Mutant r1755](https://wiki.bloodontheclocktower.com/index.php?title=Mutant&oldid=1755)
**Tests**: `src/application/read-models/table.test.ts`, `scripts/browser-check.mjs`

#### Scenario: Pending review is visible

- **WHEN** the day card contains an active madness effect without a decision for that day
- **THEN** the Storyteller sees the target, condition and review controls

#### Scenario: Reviewed effect remains auditable

- **WHEN** the Storyteller has recorded a decision
- **THEN** the day card shows that effect as reviewed until the day ends

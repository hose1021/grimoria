# Spec Delta

## MODIFIED Requirements

### Requirement: Public and player privacy

Public and player views SHALL render a projection that contains no real role,
bluff, note, effect or private day-ability text, the player handoff SHALL expose
only the shown role, and the seat route SHALL render names and seat numbers
only.

**Source**: `SPEC.md` "Runtime", "CSS and accessibility" and `/seat` "names only"; `AGENTS.md` "Architecture & Data Flow"; issue #171 SET8; [Artist r3156](https://wiki.bloodontheclocktower.com/index.php?title=Artist&oldid=3156), [Savant r2910](https://wiki.bloodontheclocktower.com/index.php?title=Savant&oldid=2910), [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/snv.test.ts`, `src/ui/screens/seat-projection.test.ts`, `scripts/browser-check.mjs:758`

#### Scenario: Public screen during a night

- **WHEN** the public screen is open during an active night
- **THEN** it shows phase, alive count, public deaths and no role or bluff element

#### Scenario: Export projection

- **WHEN** the public projection is built from a saved game
- **THEN** it contains no role, bluff, note, effect or Artist/Savant text field

#### Scenario: Private day ability

- **WHEN** the Artist question or the Savant statements are recorded
- **THEN** the public projection contains neither, and the Storyteller state and
  replay keep them

#### Scenario: Seat route

- **WHEN** the seat route renders a dealt game
- **THEN** the projection contains a player id, a seat number and a name and no
  role, shown role, team or alive field

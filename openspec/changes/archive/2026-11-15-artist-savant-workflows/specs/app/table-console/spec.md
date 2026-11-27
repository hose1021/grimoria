# Spec Delta

## ADDED Requirements

### Requirement: Private day ability panels

The day card SHALL show an Artist panel while a living Artist has not asked the
question, and a Savant panel while a living Savant has not visited that day.
Both panels SHALL read the shared projections, SHALL offer only the answer and
truth options the command accepts, and SHALL dispatch `artistQuestion` or
`savantVisit` through the existing store action. The panels SHALL contain no
game rule.

**Source**: [Artist r3156](https://wiki.bloodontheclocktower.com/index.php?title=Artist&oldid=3156), [Savant r2910](https://wiki.bloodontheclocktower.com/index.php?title=Savant&oldid=2910); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/application/read-models/table.test.ts`, `src/core/engine/snv.test.ts`

#### Scenario: Artist panel

- **WHEN** a living Artist has not used the ability
- **THEN** the day card shows the question field, the yes/no/unknown answer and
  the record control

#### Scenario: Savant panel

- **WHEN** a living Savant has not visited today
- **THEN** the day card shows two statement fields and a truth select limited to
  the choices the projection returns

#### Scenario: Used ability

- **WHEN** the Artist has asked or the Savant visited today
- **THEN** the corresponding panel is absent and the stored private text stays
  in the Storyteller state

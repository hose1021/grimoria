## ADDED Requirements

### Requirement: Phase-grouped chronicle

The game-over chronicle SHALL group the saved log under its phase heading in
chronological order: night one, day one, night two, day two, then the result.
The heading SHALL use the console language. The night, day and death filters
SHALL apply inside the groups, and a group with no matching line SHALL NOT be
rendered. The side-panel journal SHALL keep its recent preview.

**Source**: [Issue #493](https://github.com/hose1021/grimoria/issues/493); `SPEC.md` "Screens" (`/table`)
**Tests**: `scripts/browser-check.ts`

#### Scenario: Chronological sections

- **WHEN** the host opens the game-over review
- **THEN** the chronicle shows the night, day and result sections in the order the game recorded them

#### Scenario: Filtered group

- **WHEN** the host filters to deaths and a phase has no death line
- **THEN** that phase heading is not rendered

#### Scenario: Side panel stays compact

- **WHEN** the host reads the side panel during play
- **THEN** it still shows the recent preview without phase sections

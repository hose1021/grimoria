## ADDED Requirements

### Requirement: Manual aggregate votes and dead-vote bookkeeping

During an active day the engine SHALL accept a host-recorded vote count from
zero through roster size for an existing player, independently of nomination
records. It SHALL permit recording or correcting the spent token of a dead or
registered-dead player. Neither action SHALL infer voters, nominators or an
execution. Commands SHALL persist, replay and undo through the normal command
path; a new day SHALL clear tallies while preserving token state.

**Source**: [Rules Explanation r1310](https://wiki.bloodontheclocktower.com/index.php?title=Rules_Explanation&oldid=1310), [Glossary r3168](https://wiki.bloodontheclocktower.com/index.php?title=Glossary&oldid=3168), [Zombuul r3022](https://wiki.bloodontheclocktower.com/index.php?title=Zombuul&oldid=3022)
**Tests**: `src/core/engine/commands.test.ts`, `scripts/browser-check.ts`

#### Scenario: Record a total

- **WHEN** the host records five votes against a player
- **THEN** the tally is five and nominations, deaths, execution and tokens are unchanged

#### Scenario: Mark a dead vote

- **WHEN** the host marks a dead or registered-dead player's vote spent
- **THEN** that player's token is unavailable until corrected or normally restored

#### Scenario: Reject invalid bookkeeping

- **WHEN** a count is invalid, a player is unknown, or the day is unavailable
- **THEN** the action is rejected without mutation

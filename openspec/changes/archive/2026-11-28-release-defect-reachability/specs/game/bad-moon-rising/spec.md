# Spec Delta

## ADDED Requirements

### Requirement: The Tinker has a first-night death step

The Bad Moon Rising night queue SHALL include the Tinker's host death step on
the first night when the ruleset is current, SHALL keep the step outside the
printed order so later step keys do not move, and SHALL keep the recorded queue
for an older journal.

**Source**: [Tinker r1782](https://wiki.bloodontheclocktower.com/index.php?title=Tinker&oldid=1782); Issue #218
**Tests**: `src/core/engine/bmr.test.ts`, `src/core/roles/tinker/role.test.ts`, `scripts/browser-check.ts`

#### Scenario: First-night death

- **WHEN** a living Tinker is in play on the first night and the host marks the
  death on the Tinker's step
- **THEN** the Tinker dies as an ability death and the step advances

#### Scenario: Protected Tinker

- **WHEN** a good Tea Lady protects the Tinker and the host marks the death
- **THEN** the death is prevented and no death is recorded

#### Scenario: Earlier journal

- **WHEN** a journal recorded before the first-night Tinker ruleset replays
- **THEN** the first-night queue keeps its recorded step keys

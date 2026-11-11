# Spec Delta

## ADDED Requirements

### Requirement: Host choice stays out of public projections

The console SHALL keep the case and the Storyteller reason in the secret
journal, and no case, reason, journal or hidden role SHALL appear in the public
or player projection.

**Source**: Issue #42; `src/ui/AGENTS.md`
**Tests**: `js/host-choice.test.mjs`

#### Scenario: Public view

- **WHEN** a host choice is recorded
- **THEN** `publicGameView`, `publicSnapshot` and `playerSnapshot` carry no case,
  reason or hidden role

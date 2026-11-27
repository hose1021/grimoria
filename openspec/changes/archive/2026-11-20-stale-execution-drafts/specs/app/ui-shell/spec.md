# Spec Delta

## MODIFIED Requirements

### Requirement: Day execution and role panels

The day card SHALL announce the morning deaths, SHALL show the vote threshold as
`ceil(living / 2)`, SHALL record the host's execution with the optional
survival choice, and SHALL offer the Virgin nomination, Slayer, Gossip,
Moonchild and Mastermind panels only when they apply. The execution target and
the survival choice SHALL be cleared when the phase, the day or the night
changes. A custom script SHALL offer the manual winner instead.

**Source**: `SPEC.md` "Screens" (`/table`); `SPEC.md` "Domain rules"
**Tests**: `scripts/browser-check.ts`, `src/core/engine/bmr.test.ts`, `src/core/engine/snv.test.ts`, `src/ui/screens/table/helpers.test.ts`

#### Scenario: Vote threshold

- **WHEN** six players are alive
- **THEN** the day card shows three votes as the threshold

#### Scenario: Execution result

- **WHEN** the host records an execution
- **THEN** the day card names the executed player and whether the death happened

#### Scenario: New day clears the drafts

- **WHEN** the day number or the phase changes while an execution target and a
  survival choice are selected
- **THEN** both are cleared, so the next day cannot execute the previous target
  or carry the previous survival flag

#### Scenario: Manual winner

- **WHEN** the script is custom
- **THEN** the day card offers a winner team and records it

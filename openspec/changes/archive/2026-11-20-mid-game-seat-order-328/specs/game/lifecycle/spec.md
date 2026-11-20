# Spec Delta

## MODIFIED Requirements

### Requirement: Per-command phase policy

Every command type SHALL declare its phases, and a command invoked outside them
SHALL be rejected before its handler changes state. Setup commands run in
`setup`, `deal` or `seat`; `startNight` in `deal`, `seat` or a resumable
`night`; night steps in `night`; day actions in `day`; death and madness records
in `day` or `night`; `setOrder` in `setup`, `deal` or `seat`; secret
corrections, notes, review, winner, correction, new-game and import in any
phase.

**Source**: `SPEC.md` "Domain rules"; `docs/adr/0002-engine-contracts.md` "6. Lifecycle"
**Tests**: `src/core/engine/lifecycle.test.ts`

#### Scenario: Deal during night

- **WHEN** a deal command runs while the game is in `night`
- **THEN** it is rejected with `error.47` and no player, bag or phase field changes

#### Scenario: End night outside night

- **WHEN** `endNight` runs in `setup`, `deal`, `seat` or `day`
- **THEN** it is rejected with `error.78`, the day is not rebuilt and the phase is unchanged

#### Scenario: Day action at night

- **WHEN** a nomination, vote, execution or day-ability command runs in `night`
- **THEN** it is rejected with `error.7` and no nomination, vote or execution is recorded

#### Scenario: Bag reset cannot leave setup

- **WHEN** a bag command requests any phase other than `setup` with a roster reset
- **THEN** it is rejected with `error.47` and the script, roster and phase stay unchanged

#### Scenario: Host notes in any phase

- **WHEN** the host sets a note or opens the review in `setup`, `night`, `day` or `over`
- **THEN** the command is accepted and no phase changes

#### Scenario: Secret correction during play

- **WHEN** the host corrects a setup secret, such as the Fortune Teller herring, during a night
- **THEN** the command is accepted and the phase stays `night`

#### Scenario: Seat order correction during play

- **WHEN** the host tries to reorder the seats during a night or day
- **THEN** the command is rejected with `error.47` and the seat order and phase stay unchanged

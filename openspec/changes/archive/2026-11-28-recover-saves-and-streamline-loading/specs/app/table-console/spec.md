## ADDED Requirements

### Requirement: Local countdown updates

Only a running countdown display SHALL request clock ticks. Its ticks SHALL leave the surrounding console and command previews idle.

#### Scenario: Idle or expired countdown

- **WHEN** the timer is stopped or expires
- **THEN** the display stops requesting ticks

#### Scenario: Running countdown

- **WHEN** the host starts the timer
- **THEN** the remaining time updates without repeating the night-step preview

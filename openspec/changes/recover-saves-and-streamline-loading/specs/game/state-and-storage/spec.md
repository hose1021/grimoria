## ADDED Requirements

### Requirement: Legacy recovery uses the current game key

The store SHALL retain the actual v4 value for concurrent-write detection and keep a recoverable legacy value available for retry.

#### Scenario: Invalid legacy save

- **WHEN** a malformed or invalid legacy save is present and v4 is empty
- **THEN** a fresh game can be saved and the original legacy value remains recoverable

#### Scenario: Migration write fails once

- **WHEN** writing a migrated game fails
- **THEN** the store reports the failure and a later write can persist the game

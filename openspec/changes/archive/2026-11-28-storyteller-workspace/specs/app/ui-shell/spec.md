## ADDED Requirements

### Requirement: Session entry and reference lookup

The home screen SHALL put the existing session first after the deal. The reference list SHALL support filtering by localized name or catalog ID within a selected official edition.

#### Scenario: Return during play

- **WHEN** a host returns home during a night
- **THEN** the first session action opens the saved table

#### Scenario: Find by ID in a translated catalog

- **WHEN** the host selects an edition and searches for a catalog ID in another interface language
- **THEN** matching characters from that edition appear and clearing the query restores the edition list

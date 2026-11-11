## ADDED Requirements

### Requirement: Shared visual system

Grimoria's setup, storyteller table, role sheet, player handoff, public view and supporting screens SHALL use a consistent midnight-blue palette, cyan primary accent, readable typography, and restrained dark surfaces. Artwork SHALL remain behind the controls and SHALL NOT reduce text contrast or obscure status labels. Decorative motion SHALL respect reduced-motion settings.

#### Scenario: Main screen surfaces

- **WHEN** the host opens a supported screen
- **THEN** its primary panels and controls use the shared visual tokens and remain distinguishable from the background

#### Scenario: Atmospheric backdrop

- **WHEN** the application renders its village backdrop and scenario artwork
- **THEN** the imagery remains subdued behind readable controls and carries no text, characters or combat

#### Scenario: Reduced motion

- **WHEN** the operating system requests reduced motion
- **THEN** decorative transitions and ambient movement are suppressed

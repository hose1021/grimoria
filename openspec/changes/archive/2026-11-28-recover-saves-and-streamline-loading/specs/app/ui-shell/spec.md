## ADDED Requirements

### Requirement: Route and language loading

The app SHALL fetch the initial role catalog for the requested locale and load secondary screens on navigation. Home edition links SHALL open the corresponding edition and reference fetches SHALL retry after a failure.

#### Scenario: Cold localized visit

- **WHEN** a visitor with a supported language opens the home page
- **THEN** only the selected role catalog is needed to mount the home screen

#### Scenario: Edition link

- **WHEN** a visitor opens an edition link with a different saved sheet filter
- **THEN** that edition opens and ordinary sheet navigation still supports the saved filter

#### Scenario: Reference retry

- **WHEN** a request fails and a character reference is opened again
- **THEN** the app retries and can display the text

## ADDED Requirements

### Requirement: Safe recovery of a damaged setup library

The host SHALL be able to restore a valid export over a damaged library after preserving the original bytes. A dismissed or superseded file import SHALL leave the library unchanged.

**Source**: SPEC.md, setup library and reliable persistence
**Tests**: `src/infrastructure/library/bag-library.test.ts`, `scripts/browser-check.ts`

#### Scenario: Restore when the saved library cannot be parsed

- **WHEN** the host imports a valid backup over the same damaged value they opened
- **THEN** the original is backed up before the replacement and a backup or storage failure leaves the original intact for retry

#### Scenario: The library changes before an import commits

- **WHEN** another window writes a new library or the host closes the dialog or chooses a newer file
- **THEN** the obsolete import cannot overwrite the saved library

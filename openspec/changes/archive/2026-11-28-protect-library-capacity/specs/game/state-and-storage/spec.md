# Spec Delta

## ADDED Requirements

### Requirement: Capacity of named bags and pools

The library SHALL hold up to 200 named bags and 200 named pools independently. Saving a new entry at capacity or importing an oversized collection SHALL report the limit and preserve the saved entries. Updating an existing entry at capacity SHALL succeed.

**Source**: [Named bags and pools in issue 17](https://github.com/hose1021/grimoria/issues/17), existing capacity in `src/infrastructure/library/bag-library.ts`.
**Tests**: `src/infrastructure/library/bag-library.test.ts`, `scripts/browser-check.ts`

#### Scenario: Create at capacity

- **WHEN** the host tries to save a new bag or pool and its collection already has 200 entries
- **THEN** the host sees the capacity error and every previously saved entry survives a reload

#### Scenario: Edit at capacity

- **WHEN** the host updates an existing entry in a full collection
- **THEN** the edit survives a reload and the collection still contains the same 200 IDs

#### Scenario: Independent limits

- **WHEN** the bag collection is full and the pool collection has room, or the reverse
- **THEN** the host can add an entry to the collection that has room

#### Scenario: Oversized import

- **WHEN** the host imports a library with more than 200 valid entries of either kind
- **THEN** the import reports the capacity error and the existing library remains available

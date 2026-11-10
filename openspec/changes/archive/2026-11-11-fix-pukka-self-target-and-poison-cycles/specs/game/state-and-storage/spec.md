# Spec Delta

## ADDED Requirements

### Requirement: Import rejects cyclic effect states

The store SHALL validate the effect graph of an imported game. If the graph contains an unresolvable dependency cycle, import SHALL fail with `CYCLIC_EFFECT_DEPENDENCY` and SHALL leave the current in-memory game and the stored save unchanged.

**Source**: Owner decision on PR #24
**Tests**: `js/store.test.mjs`

#### Scenario: Cyclic import

- **WHEN** the host imports a structurally valid game whose effects contain a same-night mutual poison cycle
- **THEN** import returns `CYCLIC_EFFECT_DEPENDENCY`, the current game keeps its previous state, and the storage key keeps its previous value

#### Scenario: Valid sequential mutual poison import

- **WHEN** the imported game contains mutual poison effects that chronological creation order resolves
- **THEN** import succeeds and the restored state preserves both effects

### Requirement: Saved cyclic state is handled as corrupt

When the store loads a saved game whose effect graph contains an unresolvable dependency cycle, the store SHALL report a load failure, SHALL keep the original saved value under the corrupt-save backup key, and SHALL NOT overwrite it with a replacement.

**Source**: Owner decision on PR #24
**Tests**: `js/store.test.mjs`

#### Scenario: Cyclic saved game

- **WHEN** the game key contains a schema-valid save with a poison dependency cycle
- **THEN** loading reports failure, the raw value is kept under the timestamped backup key, and no cyclic state replaces it

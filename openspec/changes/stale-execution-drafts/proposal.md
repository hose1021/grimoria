# Proposal

Issue: #322

## Why

The execution target and the survival flag are table drafts. The table screen
cleared the target only when `state.createdAt` changed (a fresh game or an
import), so the next day reopened with yesterday's target still selected and the
survival checkbox still ticked. A host could execute the wrong player or carry
a Pacifist survival into a day where it no longer applies.

## What changes

- `executionDraftKey(state)` names the current phase, day and night.
- The table screen clears `executeTarget` and `executeSurvives` whenever the key
  moves: a new day, a new night or a phase change.

## What stays

- The engine's execution rules and the command payloads.
- The target clear after an accepted execution and on import.

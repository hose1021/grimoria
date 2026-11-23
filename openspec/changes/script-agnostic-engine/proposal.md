# Script-agnostic capability composition

Issue: #475

## Why

The engine resolves role abilities through typed capabilities, but it still
chooses one edition's night queue for the whole script. A pool that mixes
Trouble Brewing, Bad Moon Rising and Sects and Violets therefore has no
automatic queue, no automatic abilities and no win checks: `manualOnly` hides
the gap. The jinx table has the opposite problem — membership is reported as
`verified` without a joint behavior or an asserting test.

The owner's epic #475 requires a script-agnostic, capability-driven model:
a new script of supported characters must not need a new engine, and an
unverified combination must stay unsupported.

## What changes

- `ScriptDefinition` (`src/core/model/script-definition.ts`) describes a script
  as data: characters, origin, teams, official night order, applicable jinxes
  and one compatibility verdict.
- `scriptCompatibility` combines per-role support with a versioned interaction
  registry. `verified`, `requires-storyteller-choice` and `unsupported` keep
  their audited meaning; `automatic` separates certified automatic play from
  the explicit manual fallback.
- A certified mixed script composes every edition's role steps into one queue
  ordered by `docs/official/nightsheet.json`. Exact single-edition scripts keep
  their existing builders, step keys and journals.
- Conditional contributors compose for a mixed script; completion stays
  per-step and uses the existing shared path or the existing BMR/S&V adapter.
- `src/core/model/interactions.ts` registers every official jinx with its pin,
  status reason and asserting test. All seven are `unsupported` until their
  behavior is implemented and tested; a pool that can trigger one is not
  certified for automatic play.
- Script import accepts a mixed pool of supported characters. Unknown or
  traveller-only ids are still rejected. The bag and secrets screens show the
  role counts, non-verified interactions and whether the pool is automatic or
  manual-only.
- No storage, schema, command payload or ruleset version changes.

## Impact

- New: `night-order.ts`, `script-definition.ts`, `interactions.ts` and their
  tests; `mixed.test.ts`.
- Changed: queue dispatch and conditional composition; setup and state
  normalization; script parsing; bag, secrets and help diagnostics; three
  deliberate contract tests that asserted the old mixed rejection.
- Preserved: TB/BMR/S&V behavior, step keys, journal replay, undo/redo, atomic
  commands, privacy, offline mode and `pg.game.v4`.
- Out of scope: implementing the seven jinx behaviors, Al vs Al characters,
  Travellers/Fabled/Loric and automatic support for arbitrary JSON.

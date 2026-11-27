# Proposal

Issue: #200

## Why

Issue #200 requires the Artist and the Savant to offer complete legal, private
and replayable Storyteller workflows. Both roles were `unsupported`: a `role.ts`
with metadata only, no command, no state record and no test. The night-step
contract cannot carry a daytime private conversation, so the day command
surface must own them.

The pinned text gives the shape:

- The Artist asks any yes/no question once per game and receives "yes", "no" or
  "I don't know" (`Artist.r3156`).
- The Savant receives two private statements each day, exactly one true and one
  false, or two true / two false when impaired (`Savant.r2910`).
- A living, unimpaired Vortox makes Townsfolk information false
  (`Vortox.r3017`), so both Savant statements are false.

## What Changes

- Add the `artistQuestion` and `savantVisit` commands with typed payloads,
  schema validation, idempotency, journaling and replay.
- Add the optional `artist` and `savant` state records and the private secret
  log entries. Old saves without the fields validate unchanged.
- Add the day-card panels and the read-model projections; the UI dispatches the
  commands and computes no rule itself.
- Reclassify both roles from `unsupported` to `requires-storyteller-choice`:
  the exchange is recorded, the content stays a Storyteller decision.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game/sects-and-violets`: adds the Artist and Savant private day workflows.
- `app/table-console`: the day card renders both panels and dispatches the
  commands.
- `app/ui-and-privacy`: private questions and statements stay out of public and
  player projections.

## Impact

- `src/core/model/types.ts`, `state.ts`, `src/core/commands/contracts.ts`,
  `src/core/engine/day.ts`, `commands.ts`, `index.ts`, `sv.ts`.
- `src/application/read-models/table.ts`, `src/ui/screens/table/cards.tsx`,
  the three locale catalogs.
- `docs/rules-matrix.md`, both `rule.md` files, the support model, README.
- No schema version change: the new fields are optional on load and written
  only by the two new commands.

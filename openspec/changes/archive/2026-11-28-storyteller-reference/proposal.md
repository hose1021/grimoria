# Storyteller reference

Issue: #396

## Why

Grimoria has no dedicated reference surface. `/sheet` is a card summary: it
names a character and its ability, but not what the engine decides for that
character, what stays a Storyteller decision, or which scenarios the rule
covers. Shipping the wiki's rule prose is blocked by the licensing gate, so a
reference built from copied wiki text is not an option.

The engine already records the answer in `docs/rules-matrix.md`: every supported
rule has a status, the host decision, the engine behaviour and the asserting
scenario titles. That is the content a Storyteller needs, and it is traceable to
the same rule audit the engine is tested against.

## What Changes

- Add `/reference`: the 72 supported characters grouped by scenario, with a name
  filter and links to each detail page.
- Add `/reference/:roleId`: ability, engine facts, how to run, the engine
  behaviour per rule, special conditions, official interactions, verified
  examples, a quick reference and the pinned source.
- Generate the English dataset from `docs/rules-matrix.md` and the official
  catalog (`npm run reference`).
- Ship a complete Russian dataset; the page loads it for `ru`. Azerbaijani keeps
  the English dataset while the AZ catalog is incomplete.
- Add a parity test: the Russian dataset must carry the same roles, rule ids,
  statuses and example counts as the English one, and neither may show internal
  `SYS-`/`INFO-` rule ids.
- Read official interactions from `docs/official/jinxes.json`, filtered to pairs
  where both characters are supported.

No engine, command, projection, storage or state change. No wiki prose is
shipped: the matrix text is the project's audit of the engine, and the source
link is provenance only.

## Capabilities

### New Capabilities

- `app/reference`: the read-only Storyteller reference — discovery, engine facts,
  rule decisions, interactions, examples and localization.

### Modified Capabilities

None.

## Impact

- UI: `src/ui/screens/reference/` (route, detail, dataset loader, inline
  markup), `src/ui/shell.tsx`, `src/ui/ports.ts`, `src/entry/main.ts`, the app
  bar reference group, `css/app.css` reference tokens, and the `ru`, `en`, `az`
  catalogs.
- Data: `scripts/build-reference.ts` writes
  `public/assets/data/reference.json`; `reference.ru.json` is the translated
  mirror. Both are static assets and enter the offline precache.
- Tests: `src/ui/screens/reference/reference-data.test.ts` (dataset parity).
- Untouched: `src/core/`, commands, projections, the store, the saved-game
  schema and every other screen.

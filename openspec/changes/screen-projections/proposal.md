# Proposal

Issue: #33
Parent: #19, Stage 1.

## Why

The native console and setup screens still called the engine directly:
`cards.tsx`, `dialogs.tsx`, `frame.tsx`, `parts.tsx`, `bag.tsx` and
`secrets.tsx` imported `src/core/engine/index.ts`, and `src/entry/main.ts`
built the preview command itself. Every screen therefore owned a second copy
of the derivation: which step is current, how many targets it takes, whether a
Mayor redirect is needed, which effects touch a seat, what the setup errors are
and where the preview timestamp comes from. A screen that forgets one of those
calls drifts from the engine silently, and the engine API leaks into the UI
layer.

## What Changes

- Add `src/application/read-models/table.ts`: `tableProjection`,
  `stepProjection`, `seatProjection`, `targetBounds`, `mayorRedirectNeeded`,
  `shownRoleChoices`, `setupProjection` and `secretsProjection`. They wrap the
  engine functions and return the values the screens render.
- Add `src/application/dispatch/preview.ts`: `previewOnState` keeps the fresh
  command id and the ruleset version at the dispatch boundary, so the
  composition root no longer imports the engine.
- Rewrite the console phase cards, the step dialog, the side panel, the effect
  badges, the bag screen and the secrets screen to render those projections.
- Add `src/application/read-models/table.test.ts`: a table-driven scenario that
  applies real commands and asserts after each one that the projection equals
  the engine state.
- Add `src/ui/screens/structure.test.ts`: no screen module imports
  `src/core/engine`, no `src/ui` module imports `js/`, and the composition root
  imports the engine nowhere.
- Move `targetBounds` next to the queue's target modes in
  `src/core/engine/night.ts` and re-export it from the read model.

## Impact

- No rule, schema, route, command payload or rendered output changes. The
  projections call the same engine functions with the same arguments, and the
  existing `.mjs` and TypeScript suites keep passing.
- `InfoResult` becomes a public type of the engine so the read model can return
  it rather than assert a shape in the screen.
- `src/ui` now depends on `src/application` read models, which the layer table
  already allows; `js/` stays out of the UI.

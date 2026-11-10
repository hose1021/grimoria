# Proposal

Issue: #59
Depends on: #56 (the `app/architecture-layers` and `app/store-boundaries` specs this change modifies)

## Why

The foundation change put the typed command contracts, the store factory and
the browser adapters in `src/`, but the domain stayed in `js/`: the engine, the
state model, the script catalog and the effect graph. Two consequences block
the next step.

- `src/application` must not import `js/`, so the store reaches the domain
  through two transitional ports, `CommandExecutor` and `StateCodec`, whose
  only implementation lives in `js/composition.js`.
- Every React screen will call the engine. Moving the engine now means the UI
  work starts against a typed API instead of a port that must be deleted later.

Moving the import closure also halves `js/`: 6 644 lines of domain code leave
the legacy tree, and what remains is screens, localization data, offline
registration and five re-export shims.

## What Changes

- Move `js/engine/**` one-to-one into `src/core/engine/**` as TypeScript.
- Move the state model into `src/core/model/state.ts`, and `rules.js`,
  `scripts.js` and `effect-graph.js` into `src/core/model/` as `.ts`.
- Turn `js/engine.js`, `js/model.js`, `js/rules.js`, `js/scripts.js` and
  `js/effect-graph.js` into re-export shims, so screens and the twelve `.mjs`
  test files keep working without an edit.
- Remove the `CommandExecutor` and `StateCodec` ports. `src/application` imports
  the core command registry and codec functions directly; the store factory no
  longer takes them as dependencies.
- Extend the boundary policy: no `src` module imports `js/`, not even a type.
- Delete the dead `js/log.js`, `js/night.js` and `js/night.test.mjs`.
- Update `AGENTS.md`, `SPEC.md` and `docs/architecture.md` to the new ownership.

## Impact

- No rule, schema, storage key, export envelope, route or player-id change.
  The `.mjs` suites prove behavior is unchanged.
- The engine files change language, not logic. JSDoc stays as documentation;
  TypeScript annotations become the checked contract.
- `js/` keeps the screens; it disappears entirely in `retire-legacy-ui`.
- The `sw.js` asset list changes because module bytes change; the offline
  protocol itself is untouched.

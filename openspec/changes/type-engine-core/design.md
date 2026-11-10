# Design

## Context

`js/engine.js` is a twelve-line re-export list over `js/engine/**`. The engine
imports `../model.js`, `../rules.js`, `../effect-graph.js` and `./scripts.js`,
so the import closure that must move is fixed:

| Source | Lines | Target |
|---|---|---|
| `js/engine/**` (12 modules) | 4 943 | `src/core/engine/**` |
| `js/model.js` | 593 | `src/core/model/state.ts` |
| `js/rules.js` | 676 | `src/core/model/rules.ts` |
| `js/scripts.js` | 225 | `src/core/model/scripts.ts` |
| `js/effect-graph.js` | 207 | `src/core/model/effect-graph.ts` |

Consumers inside the repository: the screens (`bag`, `secrets`, `table`,
`table-dialogs`, `public`, `demo`, `help`, `library`, `presets`, `store`,
`composition`), the test entry, and twelve `.mjs` test files. All of them import
through the five legacy files, so shims keep them unchanged.

## Goals

- `core` owns the rules, the state model, the script catalog and the effect
  graph as typed code.
- `application` imports `core` directly; no transitional port survives.
- Behavior, storage format and tests stay identical.

## Non-goals

- Screens and localization do not move.
- `js/store.js` (the facade) does not move; `retire-legacy-ui` deletes it.
- No React, Tailwind or build change.

## Decisions

**Move the whole closure in one change.** The policy forbids `core` from
importing `js/`, so the engine cannot land while it still imports
`../model.js`. A partial move would need a second compatibility layer inside
`core`, which is more code than moving the five modules together.

**Type the moved files mechanically, module by module.** Each file enters as a
copy renamed to `.ts`; the core program then reports what to annotate. JSDoc
stays as documentation, but the checked contract is the TypeScript annotation.
No `any`: boundaries that arrive as `unknown` narrow through the existing
runtime validators.

**Erasable syntax only.** Node runs `src/**/*.test.ts` by stripping types, and
the tests import `core`. `tsconfig.core.json` gains `erasableSyntaxOnly`, so
`enum`, namespaces and parameter properties are compile errors. Const objects
and union types replace enums.

**Shims, not edits.** `js/engine.js`, `js/model.js`, `js/rules.js`,
`js/scripts.js` and `js/effect-graph.js` become one-line re-export files with a
header comment naming the owner and the removal change. This keeps the diff out
of the screens and the `.mjs` suites, which is what makes the move verifiable:
the same tests run against the new home.

**Delete the ports instead of widening them.** `createGameStore` loses the
`executor` and `codec` parameters. `application` imports the core command
registry (`validate`, `preview`, `apply`) and the codec (`create`, `parse`,
`exportGame`, `importGame`) directly. Breakage in a test that faked an
executor is the signal that the boundary moved, not a reason to keep the port.

**Delete the dead legacy modules.** `js/night.js` and `js/log.js` have no
importer; only `js/night.test.mjs` covers them. Removing them drops 143 lines
and one test file that tested nothing the app runs.

## Risks

- **JSDoc and annotations can disagree.** Mitigation: delete the JSDoc type
  tags that duplicate a signature during the move; keep prose only. The
  `js/*.test.mjs` suites prove the behavior.
- **Node type stripping rejects non-erasable syntax.** Mitigation:
  `erasableSyntaxOnly` in the core program, plus the test program imports core.
- **A screen imports a core module's named export that changed shape.**
  Mitigation: the shims re-export the exact names; the `.mjs` suites import them
  all through `js/test-entry.js`, which fails at import time on a missing name.
- **The shims outlive their intent.** Mitigation: the policy check fails if a
  `src` module imports `js/`, and `retire-legacy-ui` owns their deletion.

## Alternatives considered

- **Keep the ports and let `application` depend on an interface.** Rejected:
  the spec already says the ports are transitional; a second engine behind an
  interface is exactly what it forbids.
- **Move the engine without typing it (`checkJs` on `.ts` via `allowJs`).**
  Rejected: it keeps a second convention and leaves the UI calling untyped
  functions.

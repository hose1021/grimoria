# Design

## Context

See `proposal.md` — Why. The starting tree is measured, not assumed:

- `js/` holds 5 one-line re-export shims, 18 `*.test.mjs` files (373 tests),
  12 runtime modules, `types.d.ts` and two `AGENTS.md` files.
- `npm test` runs `js/**/*.test.mjs` and `src/**/*.test.ts`: 472 tests, 472
  pass (measured 2026-11-12).
- `scripts/check-types-policy.mjs` scans `js/` and `src/`, maps `js/` to the
  `legacy` layer, counts `any` tokens against `LEGACY_ANY_BASELINE = 77` and
  rejects `src → js` imports.
- `scripts/check-acceptance.mjs` resolves a bare test citation against `js/`,
  and scans `src` and `js` for a second support table.
- `docs/rules-matrix.md` names 17 test files and 114 citations; main specs cite
  `js/*.test.mjs` including line numbers.
- Only `src/entry/main.ts` imports the runtime modules, plus the two DOM screens
  `/help` and `/demo` through `ShellPorts.legacy.screens`.

## Goals / Non-Goals

**Goals:**

- `js/` does not exist; every runtime module and test lives under `src/` in a
  layer the policy already knows.
- `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`,
  `npm run verify` and the CI jobs name `src/` and `scripts/` only.
- Behavior, state schema, storage keys, routes, player-visible output and the
  offline activation protocol are unchanged.

**Non-Goals:**

- Migrating `/help` and `/demo` to React. They stay DOM screens in `src/entry/`
  until `retire-legacy-ui`.
- Renaming or restructuring `src/core/engine` modules.
- Removing `src/ui/legacy-bridge.tsx`; it still mounts the two DOM screens.
- Changing the 470 remaining tests, their assertions or their fixtures.

## Decisions

### Target layout

| Current | Target | Why |
|---|---|---|
| `js/store.js` | `src/entry/store.ts` | Browser composition facade; entry may import every layer. |
| `js/offline.js` | `src/entry/offline.ts` | Needs `t()` and `saveIfNeeded()`; infrastructure may not import `ui`. |
| `js/guidance.js` | `src/entry/guidance.ts` | Joins UI strings with the role catalog; only entry may import both. |
| `js/help.js`, `js/demo.js` | `src/entry/screens/help.ts`, `demo.ts` | `ui` may not import core values or infrastructure; entry is the only legal host. |
| `js/test-entry.js` | `src/entry/test-entry.ts` | Vite test-mode entry; imports the facade, core and the UI probe. |
| `js/presets.js` | `src/core/model/presets.ts` | Pure data and functions over `core` rules; the engine test suite uses it. |
| `js/roles.js` | `src/infrastructure/catalog/role-catalog.ts` | Reads `window.PG`, injects catalog scripts and builds asset URLs. |
| `js/router.js` | `src/infrastructure/routing/history-router.ts` | Browser History/`popstate` adapter over `scripts/base-path.mjs`. |
| `js/library.js` | `src/infrastructure/library/bag-library.ts` | `localStorage` adapter for saved pools and bags. |
| `js/strings.js`, `js/i18n.js`, `js/locales/*` | `src/ui/i18n/strings.ts`, `translate.ts`, `locales/*.ts` | UI catalogs and the bridged-screen translator; self-contained. |
| `js/ui.js` | `src/ui/dom.ts` (`esc`), `src/infrastructure/platform/asset-url.ts` (`assetUrl`) | Escape is a UI primitive; asset URL is a platform adapter. `modalFocus` has no caller and is deleted. |
| `js/types.d.ts` | deleted | The contract already lives in `src/core/model/types.ts`. |
| `js/{engine,model,rules,scripts,effect-graph}.js` | deleted | Re-export shims with no subject after the move. |

`js/locales/AGENTS.md` moves to `src/ui/i18n/AGENTS.md`; `js/AGENTS.md` is
deleted and its DOM-screen rules are added to `src/entry/AGENTS.md`.

### Tests follow their module

| Current | Target |
|---|---|
| `acceptance`, `bmr`, `commands`, `engine`, `host-choice`, `invariants`, `manual`, `setup`, `snv` | `src/core/engine/<name>.test.ts` |
| `presets`, `scripts`, `support` | `src/core/model/<name>.test.ts` |
| `strings` | `src/ui/i18n/strings.test.ts` |
| `library` | `src/infrastructure/library/bag-library.test.ts` |
| `offline-worker` | `src/infrastructure/offline/offline-worker.test.ts` |
| `store` | `src/entry/store.test.ts` |
| `types.test-d.ts` | `src/core/model/types.test-d.ts` |
| `shim-exports.test.mjs` | deleted with the shims |

Renaming `*.test.mjs` to `*.test.ts` is safe: Node 24 strips types, and 99
`src/**/*.test.ts` files already run this way. Every relative import inside a
moved test names the `.ts` file (`./index.ts`, `./state.ts`, `../model/types.ts`)
because Node does not map a `.js` specifier to `.ts`.

### Policy becomes a retirement guard

- Delete `JS_ROOT`, the `legacy` layer, `LEGACY_ANY_BASELINE` and the
  `js/`-only `any` count.
- Scan `src/` only. Keep the production/test split, import direction,
  browser-global, suppression and assertion rules unchanged.
- Add a rule: a relative specifier that resolves under `js/` fails with
  "the legacy tree is retired", so the directory cannot come back as an import.
- Add a tree check: `js/` must not exist. This is the RED line before deletion
  and the permanent guard after it.
- `check-acceptance.mjs` stops defaulting a bare citation to `js/`: a citation
  must carry its path, and only `src` is scanned for a second support table.

### One branch, one PR, staged commits

The issue proposes 5–7 pull requests. The repository policy runs one change on
one short-lived branch and one pull request, and `type-engine-core` used the
same shape for a comparable move. The stages below stay separate commits on one
branch, so each remains individually revertible and green. The owner can still
request a split.

### The 472-test criterion is corrected to 470

`js/shim-exports.test.mjs` has two tests whose subject is the shim surface.
After the shims are deleted the tests cannot exist. The other 371 legacy tests
move unchanged and 99 `src` tests stay, so `npm test` must report 470 tests.
Removing a test that asserts a deleted file's re-exports is not weakening a
behavioral test; `docs/rules-matrix.md` records the new baseline.

## Risks / Trade-offs

- **Node cannot import `.ts` from a `.test.mjs`.** Mitigation: every test is
  renamed to `.test.ts` in the same commit as its module, so the runner never
  mixes a `.mjs` test with a `.ts` module.
- **A layer placement breaks the policy.** `roles.js` wants `core` (issue
  suggestion) but reads `window`; it goes to `infrastructure`. `help`/`demo`
  want `src/app`, which is not a layer; they go to `entry`. Both deviations are
  listed above and are forced by `app/architecture-layers`.
- **Main specs and the matrix rot on the first deletion.** Every cited
  `js/*.test.mjs` path is rewritten in the same PR, and `scripts/openspec-check.mjs`
  plus `scripts/check-acceptance.mjs` prove no citation is missing.
- **Tailwind loses utilities.** `@source "../"` scans `src/ui` only, but
  `help`/`demo` move to `src/entry/screens`. Add that source and remove the
  `js/` sources; the browser checks compare rendered routes.
- **`store.js` runs `load()` at import.** Keeping that side effect in
  `src/entry/store.ts` preserves behavior; the store test imports it with a
  fresh query string, so it keeps working.
- **A stale `js/` reference survives in prose.** The tree check proves code and
  configuration are clean; historical mentions stay only in
  `openspec/changes/archive/`, which is excluded by policy.

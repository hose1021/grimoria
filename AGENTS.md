# Repository Guidelines

## Project Overview

Pocket Grimoire is a single-device Storyteller aid for **Blood on the Clocktower: Trouble Brewing, Bad Moon Rising and Sects & Violets**. It runs entirely in the browser as static HTML, CSS and ES modules. Game state is stored in `localStorage`; there is no backend, account system, network play or database.

The app covers setup, role dealing, seat order, secret setup, night steps, dawn, host-recorded execution, win checks and review. A separate `/sheet/{ru,en,az}` section filters 72 standard roles by scenario (22 Trouble Brewing, 25 Bad Moon Rising, 25 Sects & Violets) and shows the 5 Travellers in a separate toggle/section without changing the saved game.

## Merge Policy

The owner of the project decides every merge. An agent must not merge a pull
request, enable auto-merge, bypass a required check, or approve its own
changes.

- Finish the task on a separate branch, create the pull request, run the
  checks, report the result and stop. Do not merge.
- Review fixes go to the same branch; after them, wait for the owner again.
- Only an explicit owner message `merge PR #N` authorizes merging that one
  pull request. The permission does not carry over to another pull request.
- Before a merge, verify the current HEAD SHA, the CI result and the owner's
  permission for that exact pull request.
- Never change `main` directly. Every change goes through a separate branch
  and a pull request.

## Architecture & Data Flow

- `index.html` loads eight stylesheets, `assets/data/ru_RU.js` as a classic script (it defines `window.PG.roles`), then `js/app.js` as a module.
- `js/app.js` owns the route table. Unknown paths fall back to `/table`; `/sheet/<lang>` loads the requested role catalog before mounting.
- Each screen exports `mount(root)` returning cleanup, plus `unmount()` for partial mount failures. The router disposes the previous screen before navigation. Screens use `AbortController` and delegated `data-*` events.
- Read-only interaction state (selected targets, redirects, registrations, given information, overlays) stays in the screen module. It is committed only when the host completes the step.
- Persisting actions follow this path:

  `event -> screen action -> store.dispatch(command) -> js/engine/commands.js validate/apply on a draft -> state.applied + events -> save -> render()`

- `js/engine.js` is the stable public API for domain modules in `js/engine/`, which apply all game rules. It is DOM-free and storage-free. Domain functions return `{ ok: true, ... }` or `{ ok: false, error }`; validators return `{ ok: false, errors: [{ code, message }] }`.
- `js/model.js` defines schema v4, the active script, and pure state helpers. `js/store.js` owns the singleton `state`, loading, migration, save, undo, reset, import and export.
- `store.dispatch(command)` is the only screen mutation path. `js/engine/commands.js` validates the command on a clone, applies it atomically, checks invariants, records the id in `state.applied`, and returns `allowed`, `rejected` or `requires-storyteller-choice`; `previewCommand` reports the domain diff and delayed effects without mutating. A command id is bound to a canonical fingerprint of type, payload and ruleset version; an unsupported `rulesetVersion` is rejected. Execution uses a seeded PRNG and a controlled clock; Preview captures the command timestamp once per id, fingerprint and initial state, and Apply reuses it (`command.at` pins it explicitly), so preview and apply agree for the same initial state. When the save fails, `dispatch` rolls the in-memory state back and returns `persist-failed`; it never confirms an unsaved change. `store.run(mutator)` is a legacy escape hatch for tests and import/reset only; screens must not use it.
- The store is the only module that writes the game key `pg.game.v4`. Screens must not call `localStorage` for game state. `pg.lang` selects language; `pg.guided` stores the expanded-guidance preference.
- Player and public views use projections: `publicRoleView` / `publicGameView` in `js/model.js`, and `publicView` in `js/player.js`. The player handoff exposes `shownRoleId`, not the real role. `SPEC.md` explicitly treats the app as a local aid, not a security boundary.
- `js/demo.js` has its own in-memory game and imports `engine.js` directly. It must never read or write the saved real game.

## Key Directories

| Path | Purpose |
|---|---|
| `index.html` | Static shell and stylesheet/module entry point. |
| `js/` | Application modules, screens, domain engine, persistence and tests. |
| `css/` | Per-screen styles plus shared tokens in `app.css`. |
| `assets/data/` | Committed locale catalogs. `ru_RU.js` is loaded by `index.html`; `en_GB.js` and `az_AZ.js` load on demand. |
| `assets/img/roles/` | Role art used by `imageFor()` and the role sheet. |
| `assets/fonts/inter/` | Inter font files referenced by `css/app.css`. |
| `docs/` | Rules sources, official JSON snapshots and advisory research. |
| `.github/workflows/` | GitHub Pages test and staging workflow. |

There is no `src/` directory. The repository root is the canonical static app.

## Development Commands

```sh
# Serve the static app from the repository root with an index.html fallback.
node scripts/serve.mjs 8010
# Open http://localhost:8010/

# Run the CI test suite.
node --test js/*.test.mjs

# Run one test file or one named test.
node --test js/engine.test.mjs
node --test --test-name-pattern="at least half" js/engine.test.mjs
```

- No bundler, transpile, runtime package manager, lint or formatter step exists. Run `node scripts/build-offline.mjs` after changing runtime assets to refresh committed `sw.js`; Actions also regenerates it.
- Do not open `index.html` through `file://`; ES modules and locale catalogs need HTTP.
- The Pages workflow runs the same test command, then stages `index.html`, `css/`, `js/`, `assets/`, `favicon.svg`, `manifest.webmanifest`, `sw.js` and `.nojekyll` into `public/` and deploys it.
- Keep `.nojekyll` and all asset paths relative; the app may be served under a GitHub Pages project subpath.

## Code Conventions & Common Patterns

- Use plain ES modules with explicit `.js` extensions in relative imports. No framework, bundler or runtime dependency is present.
- Name screens after their route and return their cleanup function from `mount`. Keep event listeners on `root` and clean them up through the screen's `AbortController`.
- Use `data-*` attributes plus `closest()` for delegated interactions; do not add per-element listeners that survive navigation.
- Escape interpolated HTML with shared `esc()` from `js/ui.js`; do not inject raw role names, notes or user input.
- Domain actions are verb-first (`startNight`, `completeStep`, `recordVotes`, `executeByDecision`, `manualCorrection`). Keep new rules in `js/engine/`, export the public API through `js/engine.js`, and keep rules out of screens. Screens dispatch commands with a unique id and never mutate `state` directly.
- Preserve the `{ ok, error }` / `{ ok, errors }` result convention. Expected invalid input should return a result, not throw. Reserve exceptions for unexpected programming failures.
- Do not auto-fill Storyteller choices: false information, Spy/Recluse registration, Mayor redirects and Demon heirs are host decisions. Offer allowed options and show the reason.
- Keep state mutations idempotent where the engine already guards them: completed steps, recorded votes, dead targets, existing winners and repeated night starts.
- Use `state.order` as the seat contract. Player objects are keyed by stable IDs; do not derive identity from array position.
- Add new UI strings to `js/locales/{ru,en,az}.js` and retrieve them with `t(key, vars)`. Existing screens also contain Russian literals and the legacy `js/i18n.js` translator; do not assume the Azerbaijani UI is complete.
- Role names and abilities come from `js/roles.js` / `window.PG.roles`, not hardcoded translations. `TB` is filtered to supported non-Traveller roles (Trouble Brewing, Bad Moon Rising and Sects & Violets); use `allRoles()` for the role sheet and Travellers.
- Render whole screens by string composition; there is no virtual DOM. Re-render after a local UI edit, but persist only through the engine/store path.
- Avoid duplicating the legacy `js/night.js` queue or `js/log.js` renderer. Both are unused by the current app; new work belongs in `engine.js` and the screen modules.
- Export/import contains secret roles and notes. Keep the warning and never place secret projections in public/player views.

## Important Files

| File | Why it matters |
|---|---|
| `index.html` | Entry point; all screen CSS and locale bootstrap are declared here. |
| `js/app.js` | Route table, language bootstrap, mount sequence and fatal fallback. |
| `js/router.js` | Hash routing; default `/table`. |
| `js/model.js` | Schema v4, active script, state defaults, migration, validation, public projections. |
| `js/rules.js` | Composition, Trouble Brewing, Bad Moon Rising and Sects & Violets role data, night order, bag validation. |
| `js/scripts.js` | Official script catalog, BotC script JSON import and validation. |
| `js/engine.js` | All game rules, night queue, effects, information, death, win and day actions; `js/engine/bmr.js` owns the Bad Moon Rising queue and `js/engine/sv.js` the Sects & Violets queue. |
| `js/engine/commands.js` | Command registry, Validate/Preview/Apply, invariants, domain-event diff and idempotency ledger. |
| `js/store.js` | Singleton state, persistence, undo, reset, import/export. |
| `js/table.js` | Storyteller console: night/day cards, host decisions, execution, review. |
| `js/player.js` | Private handoff and timed self-hide. |
| `js/sheet.js` | Scenario-filtered 77-role multilingual sheet with a separate Travellers section. |
| `js/roles.js` | Locale catalog loading, role lookup and artwork mapping. |
| `js/strings.js` | Keyed UI strings and `t()` fallback behavior. |
| `js/engine.test.mjs` | Main Trouble Brewing domain test suite. |
| `js/commands.test.mjs` | Command validation, atomicity, idempotency, invariants, preview and setup commands. |
| `js/bmr.test.mjs` | Bad Moon Rising setup, night order, protections, Mastermind, Minstrel and conditional wakes. |
| `js/snv.test.mjs` | Sects & Violets composition, night order, Evil Twin, Vortox, Witch curse, Fang Gu and No Dashii. |
| `js/night.test.mjs` | Tests the legacy v2-shaped `js/night.js`; keep in mind that this module is not used by the app. |
| `.github/workflows/ci.yml` | Pull-request unit tests and Playwright regression checks. |
| `.github/workflows/pages.yml` | CI test command and Pages staging list. |
| `SPEC.md` | Architecture, state contract, screen requirements and acceptance criteria. |
| `docs/rules-sources.md` | Rules authority, checked dates and implementation interpretations. |

Documentation precedence: use `SPEC.md`, `docs/rules-sources.md`, the current source and tests as authorities. `docs/improvement-research.md` preserves the review snapshot; `docs/improvement-implementation.md` records implementation status and verification.

## Runtime/Tooling Preferences

- Browser runtime: modern Chromium/Firefox/Safari with ES modules and `localStorage`.
- Test runtime: Node 24 in CI, using the built-in `node:test` runner and `node:assert/strict`. The `.mjs` tests import `.js` ESM modules directly.
- No package manager, lockfile or dependency install is required.
- `sw.js` and `manifest.webmanifest` support deliberate offline loading. Keep all cache URLs relative, regenerate the worker after asset edits, and never auto-activate a new worker during an active game: activation follows an explicit confirmed **Update** and a successful save. `assets/` is committed.
- GitHub Pages is deployed through Actions with `.nojekyll`; the root is not processed by Jekyll.
- The app is Russian-first, with full role catalogs for `ru`, `en` and `az`; UI string coverage is uneven. Keep user-visible changes understandable in all three where practical.

## Testing & QA

- Framework: `node:test`. Tests are DOM-free and construct state with `createGame()`, `dealGame()` and `autoSecrets()`.
- `js/engine.test.mjs` contains the main behavioral suite; `js/bmr.test.mjs` covers Bad Moon Rising; `js/snv.test.mjs` covers Sects & Violets; `js/night.test.mjs` covers the legacy `night.js` helper; `js/scripts.test.mjs` covers script parsing, custom-script bags and schema v4; `js/offline-worker.test.mjs` covers the generated worker. The CI runs all twelve `*.test.mjs` files: 156 tests total. `scripts/browser-check.mjs` runs the Playwright regression checks on demand and in pull-request CI.
- Test names are complete behavioral sentences. Assert on state, counts, phases, roles and winner reason codes; do not assert random generated IDs.
- Use `make(assignment, options)` in `js/engine.test.mjs` for new engine fixtures. Use `toDay`, `appoint`, `completeRole`, `completeSystem` and `skipNight` for setup.
- The official at-least-half rule is `executionThreshold(livingCount) = ceil(living / 2)`. Six living players need three votes; preserve even/odd regression cases.
- Store regression tests and optional browser checks cover route cleanup, privacy, imports, dialogs and role sheets. For UI changes, run the app at `http://localhost:8010/`, exercise the actual route, check the browser console, and verify mobile widths around 390 px.
- No coverage threshold or coverage tool is configured. Add a focused regression test for a real behavioral bug; do not add tautological tests for wiring or markup.
- Before reporting done, run the full test command and smoke the changed route. For changes to `js/engine.js`, also check the affected screen with a real game state.

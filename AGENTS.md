# Repository Guidelines

## Scoped instructions

Read the nearest nested AGENTS.md before editing a subtree. Local files add only
scope-specific guidance; the workflow and merge policy below still apply.

- [Typed layers](src/AGENTS.md): [core](src/core/AGENTS.md), [application](src/application/AGENTS.md), [infrastructure](src/infrastructure/AGENTS.md), [UI](src/ui/AGENTS.md), [boot](src/entry/AGENTS.md).
- [Legacy modules and tests](js/AGENTS.md), [translations](js/locales/AGENTS.md), [legacy CSS](css/AGENTS.md).
- [Static assets](public/AGENTS.md), [scripts](scripts/AGENTS.md), [CI](.github/AGENTS.md), [documentation](docs/AGENTS.md), [OpenSpec](openspec/AGENTS.md).

Guidance uses focused, inherited instructions following [AI Hero's guide](https://www.aihero.dev/a-complete-guide-to-agents-md).
Keep each local file limited to its responsibility, constraints and verification;
do not copy root policy or add files to generated/vendor/archive directories.

## Project Overview

Grimoria is a single-device Storyteller aid for **Blood on the Clocktower: Trouble Brewing, Bad Moon Rising and Sects & Violets**. It runs entirely in the browser as static HTML, CSS and ES modules. Game state is stored in `localStorage`; there is no backend, account system, network play or database.

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

## Branching Strategy

`main` is the only long-lived branch. Every change uses a short-lived branch
created from the current `origin/main`, and every pull request targets `main`.

- Branch prefixes: `feat/`, `fix/`, `docs/`, `refactor/`, `test/`, `chore/`,
  `ci/`, `perf/`. `scripts/check-git-conventions.mjs` uses the same seven
  prefixes; keep the two lists identical.
- The part after the prefix is lowercase kebab-case, for example
  `feat/issue-driven-workflow` or `docs/git-workflow-conventions`.
- Do not create `develop`, `release/*` or other long-lived branches.
- Do every change in its own git worktree created from the current
  `origin/main`: `git worktree add ../grimoria-<topic> -b <type>/<topic>
  origin/main`. Edit, stage and commit only in that worktree. Every
  `/opsx-propose` run stages its artifacts with `git add` inside the worktree
  and never in the main checkout.
- After the pull request merges, remove the worktree and delete the local
  branch: `git worktree remove ../grimoria-<topic>` and `git branch -D
  <type>/<topic>`. Do this every time; the merge deletes the remote branch.

## Commit Messages

Commits and pull request titles use Conventional Commits.

- Types: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `ci:`,
  `perf:`, `build:`, `style:`, `revert:`. `build`, `style` and `revert` are
  commit types only, not branch prefixes.
- An optional scope follows the type: `fix(engine): correct the Mayor redirect`.
- The subject is English, imperative, lowercase after the prefix, and has no
  trailing period.
- A pull request title uses the same format; the description carries the
  details.

## Merge Strategy

Pull requests merge into `main` with the **squash merge** strategy. The pull
request title becomes the commit subject on `main`, so the title is the checked
surface and CI validates it. Commits inside the branch may be rewritten before
the merge. If the owner requires every commit to comply, add a commit-message
step to the `Git conventions` job; do not relax the title check.

## Issue → Spec → Change Workflow

GitHub issues track work, OpenSpec changes track specifications, and tests prove
behavior. Every implementation change follows one pipeline:

`GitHub Issue -> OpenSpec change -> branch + PR -> CI -> owner merge -> sync/archive`

- Start every new functionality from a GitHub issue and an OpenSpec change that
  names the issue in `proposal.md` (`Issue: #N`). A documentation-only or typo
  change that alters no behavior may skip the change, but its PR still names the
  issue.
- Each change contains `proposal.md`, at least one delta spec, `design.md` and
  `tasks.md`. Author them with the OpenSpec instructions, then run
  `openspec validate --changes --strict`.
- Before implementation, write the specification, its scenarios and a failing
  RED test. Record the RED command and its failure in the task evidence and the
  PR.
- Apply strict RED → GREEN → REFACTOR. Record the GREEN command and result after
  the fix.
- Never edit a requirement or weaken a test to make CI pass. A disputed rule
  needs an explicit decision grounded in the pinned official source.
- Never claim a mechanic is verified without a test. Partial, host-adjudicated
  and unsupported mechanics stay `docs/rules-matrix.md` rows or issue items, not
  spec requirements.
- If a requirement is ambiguous, stop and ask the owner for a decision.
- After implementation, open the pull request, report the CI result and wait for
  the owner.
- Merge, auto-merge, self-approval and direct changes to `main` are forbidden
  without a separate explicit owner permission for that exact pull request.
- Update main specs only from a verified change, and archive it after the merge
  once `node --test js/*.test.mjs`, `node scripts/openspec-check.mjs` and
  `openspec validate --specs --strict` pass.

The baseline specs in `openspec/specs/` describe behavior already proven by a
test. Each requirement cites its official source and the asserting test. The
consistency rules live in `scripts/openspec-check.mjs` and the
`.github/workflows/openspec.yml` job. A passing check proves that each
requirement cites an existing test file, not that the cited test asserts the
requirement; requirement-level verification stays a review task.

## Architecture & Data Flow

- `index.html` loads six stylesheets, `assets/data/ru_RU.js` as a classic script (it defines `window.PG.roles`), then `src/entry/main.ts` as a module: the composition root for the React shell.
- `src/ui/` is the React shell. `src/ui/router.ts` keeps a stable route snapshot over the shared History/`popstate` subscription; `src/ui/shell.tsx` resolves the current path; `src/ui/screens/sheet.tsx` is the native `/sheet`, `src/ui/screens/public.tsx` the native `/public`, `src/ui/screens/player.tsx` the native `/player`, and `bag.tsx`, `seat.tsx` and `secrets.tsx` the native setup screens; `src/ui/legacy-bridge.tsx` mounts an unmigrated screen by calling its `mount(root)` and cleanup in a layout effect. Unknown paths fall back to `/table`.
- `src/entry/main.ts` owns the impure boot: locale loading, the writer lock, the store facade, storage status and offline preparation. It builds `ShellPorts`; `src/ui/` imports ports and `src/core` types, never `js/`.
- Each screen exports `mount(root)` returning cleanup, plus `unmount()` for partial mount failures. The router disposes the previous screen before navigation. Screens use `AbortController` and delegated `data-*` events.
- Read-only interaction state (selected targets, redirects, registrations, given information, overlays) stays in the screen module. It is committed only when the host completes the step.
- Persisting actions follow this path:

  `event -> screen action -> store.dispatch(command) -> js/engine/commands.js validate/apply on a draft -> state.applied + events -> save -> render()`

- `src/core/engine/index.ts` is the stable public API for the domain modules in `src/core/engine/`, which apply all game rules. It is DOM-free and storage-free. `js/engine.js` is a temporary re-export shim for the screens. Domain functions return `{ ok: true, ... }` or `{ ok: false, error }`; validators return `{ ok: false, errors: [{ code, message }] }`.
- `src/core/model/state.ts` defines schema v4, the active script, and pure state helpers; `js/model.js` is a temporary re-export shim. `js/store.js` owns the singleton `state`, loading, migration, save, undo, reset, import and export.
- `store.dispatch(command)` is the only screen mutation path. `js/engine/commands.js` validates the command on a clone, applies it atomically, checks invariants, records the id in `state.applied`, and returns `allowed`, `rejected` or `requires-storyteller-choice`; `previewCommand` reports the domain diff and delayed effects without mutating. A command id is bound to a canonical fingerprint of type, payload and ruleset version; an unsupported `rulesetVersion` is rejected. Execution uses a seeded PRNG and a controlled clock; Preview captures the command timestamp once per id, fingerprint and initial state, and Apply reuses it (`command.at` pins it explicitly), so preview and apply agree for the same initial state. When the save fails, `dispatch` rolls the in-memory state back and returns `persist-failed`; it never confirms an unsaved change. `store.run(mutator)` is a legacy escape hatch for tests and import/reset only; screens must not use it.
- The store is the only module that writes the game key `pg.game.v4`. Screens must not call `localStorage` for game state. `pg.lang` selects language; `pg.guided` stores the expanded-guidance preference.
- Player and public views use projections: `publicRoleView` / `publicGameView` in `src/core/model/state.ts`, and the seat projection in `src/ui/screens/player.tsx`. The player handoff exposes `shownRoleId`, not the real role. `SPEC.md` explicitly treats the app as a local aid, not a security boundary.
- `js/demo.js` has its own in-memory game and imports `engine.js` directly. It must never read or write the saved real game.

## Key Directories

| Path | Purpose |
|---|---|
| `index.html` | Static shell and stylesheet/module entry point. |
| `js/` | Legacy screens, the engine shims, persistence and tests. |
| `src/ui/` | React shell, router store, legacy bridge, shared components, the native screens, Tailwind entry and tokens. |
| `src/entry/` | Composition root that wires the legacy modules into the shell ports. |
| `css/` | Per-screen styles plus shared tokens in `app.css`. |
| `assets/data/` | Committed locale catalogs. `ru_RU.js` is loaded by `index.html`; `en_GB.js` and `az_AZ.js` load on demand. |
| `assets/img/roles/` | Role art used by `imageFor()` and the role sheet. |
| `assets/fonts/inter/` | Inter font files referenced by `css/app.css`. |
| `docs/` | Rules sources, official JSON snapshots and advisory research. |
| `openspec/` | Verified main specs in `specs/` and active changes in `changes/`. |
| `.github/workflows/` | Unit tests, Playwright checks, OpenSpec validation and Pages staging. |

`src/` holds the layered application (`core`, `application`, `infrastructure`); `js/` keeps the legacy screens and the engine until they migrate. `index.html` and the Vite config stay at the repository root; the deployed artifact is `dist/`.

## Development Commands

```sh
npm ci                    # install the pinned devDependencies once after checkout
npm run dev               # Vite dev server; open the printed URL
npm run typecheck         # legacy checkJs gate plus the app, core and test programs
npm run lint              # oxlint over js, src, scripts and the Vite config
npm run format            # oxfmt over the tracked source and the root config
npm run format:check      # fail when a tracked file is not formatted
npm test                  # node --test "js/**/*.test.mjs" "src/**/*.test.ts"
npm run build             # Vite build into dist/
npm run fallback          # generated dist/404.html with the configured base
npm run offline           # generated dist/sw.js from dist/
npm run verify            # typecheck + lint + format check + tests + build + fallback + offline + policy
node scripts/serve-dist.mjs --root dist --prefix /   # serve the build like Pages
node scripts/check-types-policy.mjs                  # layers, source sets, suppressions, shell tokens

# One test file or one named test.
node --test js/engine.test.mjs
node --test --test-name-pattern="at least half" js/engine.test.mjs
```

- oxlint and oxfmt are the only lint and format tools. ESLint and Prettier are not installed; `node scripts/check-toolchain.mjs` fails when either reappears as a dependency, a config file, an ignore file or a script command.
- Vite builds `dist/`; Pages publishes that artifact. `BASE_PATH` selects `/`, a project subpath or a custom domain and feeds the router, the fallback page and the worker.
- `sw.js` and `404.html` are generated into `dist/`; neither is committed. `npm run verify` regenerates both after a build.
- TypeScript checks every tree with `noEmit`: `js/**` through `checkJs`, `src/**` through the app and DOM-free core programs, tests through their own program. `@types/node` is test-only.
- Do not open `index.html` through `file://`; the dev server and the locale catalogs need HTTP.
- Keep `.nojekyll` and all asset paths relative; the app may be served under a GitHub Pages project subpath.

## Code Conventions & Common Patterns

- Use ES modules with explicit `.js` extensions in relative imports. React 19, ReactDOM, Radix Dialog/Label and Tailwind CSS v4 (through `@tailwindcss/vite`) are the declared dependencies; nothing else enters without a decision.
- Name screens after their route and return their cleanup function from `mount`. Keep event listeners on `root` and clean them up through the screen's `AbortController`.
- Use `data-*` attributes plus `closest()` for delegated interactions; do not add per-element listeners that survive navigation.
- Escape interpolated HTML with shared `esc()` from `js/ui.js`; do not inject raw role names, notes or user input.
- Domain actions are verb-first (`startNight`, `completeStep`, `recordVotes`, `executeByDecision`, `manualCorrection`). Keep new rules in `src/core/engine/`, export the public API through `src/core/engine/index.ts`, and keep rules out of screens. Screens dispatch commands with a unique id and never mutate `state` directly.
- Preserve the `{ ok, error }` / `{ ok, errors }` result convention. Expected invalid input should return a result, not throw. Reserve exceptions for unexpected programming failures.
- Do not auto-fill Storyteller choices: false information, Spy/Recluse registration, Mayor redirects and Demon heirs are host decisions. Offer allowed options and show the reason.
- Keep state mutations idempotent where the engine already guards them: completed steps, recorded votes, dead targets, existing winners and repeated night starts.
- Use `state.order` as the seat contract. Player objects are keyed by stable IDs; do not derive identity from array position.
- Add new UI strings to `js/locales/{ru,en,az}.js` and retrieve them with `t(key, vars)`. Existing screens also contain Russian literals and the legacy `js/i18n.js` translator; do not assume the Azerbaijani UI is complete.
- Role names and abilities come from `js/roles.js` / `window.PG.roles`, not hardcoded translations. `TB` is filtered to supported non-Traveller roles (Trouble Brewing, Bad Moon Rising and Sects & Violets); use `allRoles()` for the role sheet and Travellers.
- Render legacy `js/` screens by string composition; native `src/ui/` screens use React. Re-render after a local UI edit, but persist only through the engine/store path.
- Avoid duplicating the legacy `js/night.js` queue or `js/log.js` renderer. Both are unused by the current app; new work belongs in `engine.js` and the screen modules.
- Export/import contains secret roles and notes. Keep the warning and never place secret projections in public/player views.

## Important Files

| File | Why it matters |
|---|---|
| `index.html` | Entry point; all screen CSS and locale bootstrap are declared here. |
| `src/entry/main.ts` | Composition root: locale boot, writer lock, store facade, shell ports. |
| `src/ui/shell.tsx` | Route resolution, writer policy, hand-back cover and fatal fallback. |
| `src/ui/legacy-bridge.tsx` | Mount and dispose an unmigrated screen inside the shell. |
| `src/ui/store/use-game.ts` | `useSyncExternalStore` over the cached store snapshot. |
| `src/ui/styles/shell.css` | Tailwind theme and utilities in explicit layers, Preflight off. |
| `src/ui/styles/tokens.css` | The one `@theme` block mirroring the `css/app.css` tokens. |
| `js/router.js` | Hash routing; default `/table`. |
| `src/core/model/state.ts` | Schema v4, active script, state defaults, migration, validation, public projections. `js/model.js` re-exports it. |
| `js/rules.js` | Composition, Trouble Brewing, Bad Moon Rising and Sects & Violets role data, night order, bag validation. |
| `js/scripts.js` | Official script catalog, BotC script JSON import and validation. |
| `src/core/engine/index.ts` | All game rules, night queue, effects, information, death, win and day actions; `engine/bmr.ts` owns the Bad Moon Rising queue and `engine/sv.ts` the Sects & Violets queue. `js/engine.js` re-exports it. |
| `js/engine/commands.js` | Command registry, Validate/Preview/Apply, invariants, domain-event diff and idempotency ledger. |
| `js/store.js` | Singleton state, persistence, undo, reset, import/export. |
| `js/table.js` | Storyteller console: night/day cards, host decisions, execution, review. |
| `src/ui/screens/player.tsx` | Private handoff: seat picker, timed role card and the claim dialog. |
| `src/ui/screens/sheet.tsx` | Scenario-filtered 77-role multilingual sheet with a separate Travellers section; read-only. |
| `js/roles.js` | Locale catalog loading, role lookup and artwork mapping. |
| `js/strings.js` | Keyed UI strings and `t()` fallback behavior. |
| `js/engine.test.mjs` | Main Trouble Brewing domain test suite. |
| `js/commands.test.mjs` | Command validation, atomicity, idempotency, invariants, preview and setup commands. |
| `js/bmr.test.mjs` | Bad Moon Rising setup, night order, protections, Mastermind, Minstrel and conditional wakes. |
| `js/snv.test.mjs` | Sects & Violets composition, night order, Evil Twin, Vortox, Witch curse, Fang Gu and No Dashii. |
| `.github/workflows/ci.yml` | Pull-request unit tests and Playwright regression checks. |
| `.github/workflows/pages.yml` | CI test command and Pages staging list. |
| `SPEC.md` | Architecture, state contract, screen requirements and acceptance criteria. |
| `docs/rules-sources.md` | Rules authority, checked dates and implementation interpretations. |

Documentation precedence: use `openspec/specs/` for the verified behavior baseline, `SPEC.md`, `docs/rules-sources.md`, the current source and tests as authorities. `docs/rules-matrix.md` remains the per-role audit table. `docs/improvement-research.md` preserves the review snapshot; `docs/improvement-implementation.md` records implementation status and verification.

## Runtime/Tooling Preferences

- Browser runtime: modern Chromium/Firefox/Safari with ES modules and `localStorage`.
- Test runtime: Node 24 in CI, using the built-in `node:test` runner and `node:assert/strict`. The `.mjs` tests import `.js` ESM modules directly.
- Run `npm ci`; the lockfile pins Vite, TypeScript, React, Radix, Tailwind and the test-only Node types. React, ReactDOM and the two Radix packages ship to the browser.
- `sw.js` and `manifest.webmanifest` support deliberate offline loading. Keep all cache URLs relative, regenerate the worker after asset edits, and never auto-activate a new worker during an active game: activation follows an explicit confirmed **Update** and a successful save. `assets/` is committed.
- GitHub Pages is deployed through Actions with `.nojekyll`; the root is not processed by Jekyll.
- The app is Russian-first, with full role catalogs for `ru`, `en` and `az`; UI string coverage is uneven. Keep user-visible changes understandable in all three where practical.

## Testing & QA

- Framework: `node:test`. Tests are DOM-free and construct state with `createGame()`, `dealGame()` and `autoSecrets()`.
- `js/engine.test.mjs` contains the main behavioral suite; `js/bmr.test.mjs` covers Bad Moon Rising; `js/snv.test.mjs` covers Sects & Violets; `js/scripts.test.mjs` covers script parsing, custom-script bags and schema v4; `js/offline-worker.test.mjs` covers the generated worker. The CI runs the eleven `*.test.mjs` files plus the TypeScript suites: 260 tests total. `scripts/browser-check.mjs` runs the Playwright regression checks on demand and in pull-request CI.
- Test names are complete behavioral sentences. Assert on state, counts, phases, roles and winner reason codes; do not assert random generated IDs.
- Use `make(assignment, options)` in `js/engine.test.mjs` for new engine fixtures. Use `toDay`, `appoint`, `completeRole`, `completeSystem` and `skipNight` for setup.
- The official at-least-half rule is `executionThreshold(livingCount) = ceil(living / 2)`. Six living players need three votes; preserve even/odd regression cases.
- Store regression tests and optional browser checks cover route cleanup, privacy, imports, dialogs and role sheets. For UI changes, run the app at `http://localhost:8010/`, exercise the actual route, check the browser console, and verify mobile widths around 390 px.
- No coverage threshold or coverage tool is configured. Add a focused regression test for a real behavioral bug; do not add tautological tests for wiring or markup.
- Before reporting done, run the full test command and smoke the changed route. For changes to `src/core/engine/`, also check the affected screen with a real game state.

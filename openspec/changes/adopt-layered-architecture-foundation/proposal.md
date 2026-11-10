# Proposal

Issue: #52

## Why

The app works, and its domain layer is already the clean part: `js/engine/**`,
`js/model.js`, `js/rules.js`, `js/scripts.js` and `js/effect-graph.js` contain
no `window` or `document` reference, and 209 tests run against them without a
DOM. Three structural limits remain, and each one blocks the next.

1. **No build step.** `index.html` loads `assets/data/ru_RU.js` as a classic
   script and `js/app.js` as a module; `js/roles.js` injects every other
   catalog through a `<script>` tag. Asset URLs are built at runtime
   (`imageFor()` returns `assets/img/roles/<name>`), so nothing can be
   fingerprinted. The offline worker hashes source bytes
   (`scripts/build-offline.mjs`) and replaces its whole cache on every release.
2. **Browser concerns sit inside the domain path.** `js/store.js` reads
   `localStorage` in its module body (`export const state = load()`), registers
   a `window` listener on import, and cannot be instantiated twice in one
   process: `js/store.test.mjs` imports `./store.js?test=N` to get a fresh copy.
   Determinism patches the global `Math.random` in `js/engine/commands.js` and
   the module-level `clockOverride` in `js/model.js`.
3. **UI and rules share one module graph.** Screens import the singleton and
   call `dispatch`. `js/table.js` is 1530 lines and `js/bag.js` is 1749, with no
   component boundary; 102 `any` tokens, 25 `Record<string, any>` and 19
   `[key: string]: unknown` index signatures remain at the command, effect and
   night-step boundaries.

A bundler cannot land without changing the published artifact and the offline
cache; typed commands cannot land cleanly without a TypeScript test runtime;
the UI cannot be split without a store that is created rather than imported.
This change prepares that footing and changes no game rule.

## What Changes

Three increments, each independently reviewable and reversible, delivered as
one OpenSpec change because they share one contract: the store factory is what
the build entry point composes, and the typed command surface is what the
factory dispatches.

1. **Typed command surface.** `CommandInput` (what a screen composes) is
   separated from `PreparedCommand` (what the engine receives) by one
   `prepareCommand` call that allocates the id, timestamp, ruleset version and
   fingerprint, so preview and dispatch of one action share one identity. The
   surface gains a payload discriminated union per command type, a closed
   result union, typed Storyteller choices, and a domain outcome that carries no
   persistence state.
   `unknown` replaces `any` at the JSON, `localStorage` and import boundaries;
   runtime validation stays the only way to obtain a validated state. The
   `any` count in legacy files becomes a checked-in ratchet.
2. **Vite build with the existing UI.** Add pinned devDependencies, a locked
   `package.json`, `vite.config.ts`, four TypeScript configurations (the
   existing `js` gate, the application tree, the DOM-free core and the tests)
   and the scripts `dev`, `build`, `preview | typecheck`. `vite build` emits
   `dist/`;
   `scripts/build-offline.mjs` runs after it and hashes `dist/` instead of the
   source root; GitHub Pages uploads `dist/`. Public URLs, manifest scope and
   the update protocol stay as they are. The fallback document becomes
   generated with the normalized base, because the current
   `location.replace("./")` resolves a nested route such as
   `/sheet/ru` to its parent directory and reloads the same 404. A Pages-like
   server (`scripts/serve-dist.mjs`) returns a real 404 so the fallback can be
   proven.
3. **Store boundaries.** `createGameStore(deps)` with injected storage, clock,
   random source, id generator and browser coordination. It keeps the
   transaction order `prepare → validate → apply on draft → invariants →
   persist → publish`, returns a rejected result with `persist-failed` instead
   of confirming an unsaved change, publishes a save-status snapshot so a
   subscriber can see the failure, exposes a cached immutable snapshot with a
   game revision and a view version for `useSyncExternalStore`, and owns undo
   history. `js/store.js` becomes a thin facade over one browser-wired
   instance; every export a screen uses keeps its current shape, so the
   existing screens keep working without an edit.

React, Tailwind and the screen migration are **not** in this change. `design.md`
carries the target structure, the boundary rules they must obey and a map of the
changes that deliver them.

## Capabilities

### New Capabilities

- `app/build-pipeline`: the build, base path, Pages publication, nested-route
  fallback and artifact-derived offline asset list.
- `app/architecture-layers`: the four layers, the import direction, the
  composition root and the static check that fails on a violation.
- `app/command-contracts`: `CommandInput`, the per-type payload union, the
  result union, the domain/persistence split and the untrusted-boundary rule.
- `app/store-boundaries`: the store factory, its dependencies, the transaction
  order, undo, snapshots, cross-tab behaviour and read-model projections.

### Modified Capabilities

None. `app/offline`, `app/ui-and-privacy`, `game/state-and-storage` and
`game/command-engine` keep their requirements. The command-engine baseline
already allows a caller to pin `command.at`; the store does exactly that, so the
preview/apply agreement, the fingerprint conflict rule and the idempotency
ledger stay true for both the legacy call and the store path.

## Non-goals

- React, Tailwind or any UI rewrite. No screen is migrated here.
- Backend, accounts, server-side rendering, multiplayer, event sourcing,
  monorepo tooling or a separate npm package.
- A state schema change. `pg.game.v4`, schema v4, the export envelope, the
  v2/v3/v4 migrations, stable player ids and `state.order` stay untouched.
- Redesign. Visual tokens and layouts move unchanged into the build.
- Automatic service-worker activation, `skipWaiting` on install, or a PWA
  plugin that takes over the update protocol.
- Rewriting the engine or moving game rules into components.
- Storybook, a public component playground or a component-test framework.

## Compatibility

- **Saves.** Same key, same schema, same migration path, same export envelope.
  A save written before this change loads after it and the reverse. A rollback
  to the previous build therefore keeps every game; it only re-serves older
  code.
- **URLs.** `/table`, `/bag`, `/seat`, `/secrets`, `/player`, `/public`,
  `/help`, `/demo`, `/sheet` and `/sheet/{ru,en,az}` keep their current paths
  and the unknown-path fallback stays `/table`. The fallback document redirects
  to the configured base instead of a parent directory, and restores a stored
  path only inside that base. Hash routing is not adopted.
- **Commands.** One logical action keeps one identity: `prepareCommand`
  allocates or preserves the id, timestamp and ruleset version once, and
  `preview` and `dispatch` reuse that prepared object. The idempotency ledger,
  the fingerprint conflict rule and the preview/apply agreement are unchanged.
  `applyCommand(state, command)` keeps its current timestamp resolution for
  callers that do not supply a timestamp, so `game/command-engine` behaviour is
  unchanged; the store path always supplies one.
- **Offline.** The `PREPARE_UPDATE` / `SKIP_WAITING` protocol, the
  `pg-static-` cache prefix, the save-before-activate gate and the **Update** /
  **Later** choice are preserved. Only the asset list source moves from the
  source tree to `dist`.
- **One deliberate behaviour correction.** `undo()`, `reset()` and
  `importGame()` currently call `save()` and report success regardless of the
  write result (`js/store.js:190`, `js/store.js:259-297`). They will report a
  failed write instead of a false success. No game rule changes; the host gains
  a truthful error. It is listed here because it is observable.
- **Coexistence.** While screens migrate, one store instance backs both UIs and
  exactly one owner renders a route. No second source of game state is allowed.
  The load-bearing legacy contract is `undo()`: it keeps returning a boolean, so
  `js/table.js:1341` does not enter its success branch after a failed write; the
  typed result stays on the store.

## Impact

- Runtime: `js/store.js` becomes a facade; the typed contracts and command
  preparation land in `src/core/commands/`, and `src/application/dispatch/`
  maps the legacy command shape; the command path takes its clock and seed from
  the caller instead of a module-level override; `js/offline.js` registers the
  worker through the configured base URL.
- New: `package.json` lockfile entries including the test-only `@types/node`,
  `vite.config.ts`, `tsconfig.app.json`, `tsconfig.core.json`,
  `tsconfig.test.json`, `src/` for the new layers with type-only core ports,
  `public/` for copied static assets, `scripts/build-fallback.mjs` and
  `scripts/serve-dist.mjs`.
- Moved: `assets/img`, `assets/fonts`, `assets/data` into `public/assets` with
  unchanged public URLs.
- CI: `ci.yml` type-checks four configurations and runs the build;
  `pages.yml` uploads `dist/`; `openspec.yml` is unchanged.
- Offline: `sw.js` and `404.html` become build artifacts of `dist`, no longer
  committed source files; the generator requires `--root` and `--out` so it
  cannot read the source tree after a Vite build.
- Docs: `AGENTS.md`, `SPEC.md`, `README.md` carry statements this change makes
  false ("no bundler", "no package manager", "root is the canonical app",
  "Pages publishes the source"). They are corrected by the task that makes each
  statement false, not before.
- Tests: 209 existing tests stay the behavioural baseline; new assertions are
  added to `js/commands.test.mjs`, `js/store.test.mjs`,
  `js/offline-worker.test.mjs`, `js/types.test-d.ts`,
  `scripts/check-types-policy.test.mjs` and `scripts/browser-check.mjs`.

## Dependencies

- `adopt-strict-typescript-checkjs` (active, merged in code, not archived): it
  owns the `checkJs` gate, the suppression policy and `app/static-types`. This
  change builds on it and must not restate its requirements. If both are
  archived in the same session, archive the types change first.
- `adopt-issue-driven-workflow` (active): defines the issue → change → PR path
  this proposal follows.
- Issue #33 (single source of truth for screens) overlaps in intent. This change
  does not take it over: #33 removes duplicated rule computation from screens,
  while this change supplies the boundaries the screens will move into.

## Open questions

1. **TypeScript major.** The repository pins `5.9.3`. The registry latest is
   `7.0.2`, the native compiler. This change stays on `5.9.3` for the legacy
   `checkJs` gate and does not adopt TypeScript 7 without its own verification
   task. The owner decides whether the upgrade becomes a separate change.
2. **Base path source.** The Pages base is `/<repo>/` today. CI can derive it
   from the repository name or read a repository variable. A custom domain
   requires `/`. The proposal defaults to a Vite `base` value supplied at build
   time, with `/` as the fallback; the owner confirms whether a custom domain is
   planned.

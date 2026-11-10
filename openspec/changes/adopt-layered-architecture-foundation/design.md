# Design

## Context

See `proposal.md` "Why". This section records the state the change starts from,
verified against the sources at commit `94c32dd`, not against earlier notes.

### How the app loads

- `index.html` loads `assets/data/ru_RU.js` as a classic script, then
  `js/app.js` as a module. Eight stylesheets are linked in the same file.
  An inline `document.write` block pins a `<base href>` to the app folder,
  because routes are real paths and relative URLs would otherwise resolve
  against the route.
- `js/roles.js` injects `assets/data/en_GB.js` or `az_AZ.js` with a `<script>`
  tag and reads `window.PG.roles`. 27 locale catalogs are committed
  (`assets/data`, 5.1 MB); only three are loaded.
- Role art resolves by computed name: `imageFor(role)` returns
  `assets/img/roles/<name>`. `css/app.css` references the two Inter font files
  by relative URL.
- `js/router.js` derives its root from `new URL("../", import.meta.url)`. This
  works only because `js/` sits exactly one level below the app root. It is
  module-URL arithmetic, not configuration.

### Module graph as it stands

| Layer | Modules | Imports |
|---|---|---|
| Entry | `js/app.js` | every screen, `store`, `router`, `offline`, `writer`, `i18n`, `strings` |
| Screens | `bag`, `seat`, `secrets`, `table`, `table-dialogs`, `player`, `public`, `help`, `demo`, `sheet` | `store` singleton, `engine.js`, `model.js` (demo only), `roles`, `strings`, `router`, `ui` |
| Persistence | `js/store.js` | `model.js`, `engine/commands.js`, `localStorage`, `window` |
| Command API | `js/engine/commands.js` | all `js/engine/*` modules, `model.js`, `effect-graph.js`, `rules.js` |
| Domain | `js/engine/*`, `js/model.js`, `js/rules.js`, `js/scripts.js`, `js/effect-graph.js` | each other only; no `window`, no `document` |

`js/engine/**`, `js/model.js`, `js/rules.js`, `js/scripts.js` and
`js/effect-graph.js` contain no DOM reference. That is the property the target
`src/core` layer must keep, and the reason the core can move without a rewrite.

### Contracts as they stand

`js/types.d.ts` declares `Command` with `type: CommandType | string` and
`payload?: Record<string, any>`; `AllowedResult` carries eight optional fields;
`Effect`, `NightStep` and `Used` each end with `[key: string]: unknown`. The
command registry has 37 entries (`js/engine/commands.js:409`). Observed counts:

| Measure | Count |
|---|---|
| `any` occurrences in `js/**` | 102 |
| `Record<string, any>` | 25 |
| `[key: string]: unknown` index signatures | 19 |
| `@ts-expect-error` in `js/types.test-d.ts` | 9 |
| `as any` | 0 |

### Store, save and history

- `js/store.js` runs `load()` in its module body (`export const state = load()`),
  registers a `window` `storage` listener at import, and keeps
  `savedRevision`, `diskSnapshot` and `history` as module variables. Tests
  import `./store.js?test=N` to obtain a fresh instance.
- `dispatch(command)` clones the live state, calls `applyCommand` on it,
  persists the whole state, and on a failed write restores the clone and
  returns `{ status: "rejected", errorCode: "persist-failed" }`.
- `save()` refuses to write when `localStorage.getItem(KEY)` differs from
  `diskSnapshot`, bumps `state.revision`, and notifies subscribers after the
  write. A `storage` event replaces the live state and clears undo history.
- `undo()` returns `true` whether or not the write succeeded; `reset()`,
  `replaceState()` and `importGame()` call `save()` and ignore its result. This
  is the one behaviour the change corrects.
- Mutation is in place: `replaceContents(target, source)` deletes and reassigns
  keys, so every screen holding the `state` reference sees the new content.
  Subscribers are notified after persistence.
- Determinism: `withClock` sets a module-level `clockOverride` in `js/model.js`;
  `withDeterminism` replaces the global `Math.random` for the duration of a
  command; `previewTimestamps` is a module-level `Map`.

### Direct storage users

Only `js/store.js` writes the game key `pg.game.v4`. Preferences are scattered:
`pg.lang` (read in `js/app.js:48`, written in `js/i18n.js:255`), `pg.guided`
(`js/table.js:98`), `pg.sheetScenario` and `pg.sheetTravellers`
(`js/sheet.js:48-49`), and the library key in `js/library.js`. Each site has its
own `try`/`catch`.

### Routing, Pages and offline

- Routes are paths with `/table` as the default and fallback. `404.html` stores
  `pg.redirect` in `sessionStorage` and redirects to `./`; the router restores
  the route on the next boot.
- `scripts/serve.mjs` answers every unknown path with `index.html` and status
  200. It therefore cannot demonstrate GitHub Pages behaviour.
- `pages.yml` runs the tests, regenerates `sw.js` from the source tree, copies
  runtime files into `public/` and uploads that directory. Pages therefore
  publishes sources.
- `js/offline.js` registers `"./sw.js"` relative to the document and runs a
  preflight: the page saves (`saveIfNeeded`), asks the waiting worker to check
  every other window, and only then sends `SKIP_WAITING`. `controllerchange`
  reloads once, and only after a successful save. The generated worker
  (`scripts/build-offline.mjs`) precaches 424 assets, prunes older
  `pg-static-` caches on activation, serves navigations from the cached `"./"`
  and leaves unknown assets to the network.
- `js/offline-worker.test.mjs` parses the generated `sw.js` and executes it in a
  `vm` context with fake caches, clients and ports. It proves the protocol
  without a browser.

### Checks and publication

`node --test js/*.test.mjs` → 209 passing (12 files). `npm run typecheck` →
0 diagnostics. `node --test scripts/check-types-policy.test.mjs` → 4 passing.
`node scripts/check-types-policy.mjs` → passed. `node scripts/openspec-check.mjs`
→ 10 specs, 5 active changes. `openspec validate --changes --strict` → 5/5;
`--specs --strict` → 10/10. CI has `typecheck`, `unit`, `browser` (Playwright
1.65 installed outside the repository), `openspec` and `git-conventions` jobs;
`pages.yml` deploys on push to `main`.

Playwright is not installed in the repository, so browser checks are not
runnable locally without installing it. `scripts/browser-check.mjs` always
checks the **current source application**, not a future build.

### Tool facts used by this design

| Fact | Evidence |
|---|---|
| Node runs `.ts` files by type stripping by default | Node `Modules: TypeScript`; stable since v24.12.0/v25.2.0 |
| Type stripping rejects `enum`, runtime `namespace`, parameter properties, decorators | same |
| `.tsx` is unsupported by Node | same |
| Node ignores `tsconfig.json`; import specifiers need explicit extensions; type imports need `type` | same |
| Local probe: `node --test <dir>` discovers `*.test.ts` and a `.ts` test can import a legacy `.js` ESM module | run on Node v26.13.0 in this repository |
| Vite 8.3.7 requires Node `^20.19.0 || >=22.12.0`; `base` feeds `import.meta.env.BASE_URL` | npm metadata and Vite config docs |
| Tailwind 4.3.5 ships `@tailwindcss/vite`; `@import "tailwindcss"` bundles theme, preflight and utilities | Tailwind Vite installation docs |
| `useSyncExternalStore` requires a cached, immutable snapshot that changes identity only on change | React reference |
| GitHub Pages serves `404.html` for unknown paths and has no rewrite rules | GitHub Pages documentation |

Versions pinned by this change: `vite 8.3.7` and `typescript 5.9.3`
(unchanged). The follow-ups pin `react`/`react-dom 19.3.1`,
`@vitejs/plugin-react 6.3.0`, `tailwindcss 4.3.5` and `@tailwindcss/vite 4.3.5`
when they add them. The peer sets were checked in advance: `@vitejs/plugin-react`
requires Vite `^8` and marks `oxc-transform-react`, `@rolldown/plugin-babel` and
`babel-plugin-react-compiler` optional, so they need not be installed;
`@tailwindcss/vite` accepts Vite 5 through 8. The lockfile pins exact versions.

## Goals / Non-Goals

Goals:

- A build that emits `dist/`, publishes it from `actions`, and keeps every
  current URL, save and offline guarantee.
- Four layers with a checkable import direction and a single composition root.
- Command and result types exact enough that a wrong payload fails the build,
  while runtime validation remains the gate for untrusted input.
- A store that is created with its dependencies, so the browser, a test and the
  demo each construct their own instance.
- A stable snapshot contract that the React change can consume unchanged.

Non-goals: React, Tailwind and screen migration (they follow), a schema change,
redesign, a PWA plugin that owns activation, and any new runtime dependency in
the browser.

## Target structure

```text
src/
  core/                       pure; no DOM, no storage, no React
    model/                    state v4, defaults, projections, migration, validation
    rules/                    role catalogs, composition, night order, script parsing
    engine/                   night, day, death, effects, information, bmr, sv, corrections
    effect-graph/             poison and drunk dependency resolution
    commands/                 registry, normalization, validate, preview, apply, invariants
  application/
    ports/                    GameStorage, Clock, RandomSource, IdSource, Coordination
    store/                    createGameStore, history, snapshot, subscriptions
    dispatch/                 CommandInput normalization and transaction orchestration
    read-models/              public and player selectors over core projections
  infrastructure/
    storage/                  localStorage adapter, revision and disk snapshot
    preferences/              pg.lang, pg.guided, pg.sheet* keys in one adapter
    coordination/             Web Locks writer, storage-event bridge
    import-export/            JSON envelope
    offline/                  registration, update protocol, preflight, status banner
    platform/                 Date clock, crypto ids, seeded PRNG
  ui/                         React + TypeScript (later change); empty in this one
  data/                       role catalogs imported as modules
  entry/                      composition root: wires infrastructure into application
public/                       copied verbatim: assets/, favicon.svg, 404.html,
                              manifest.webmanifest
dist/                         build output, generated, not committed
```

Tests stay beside the modules they exercise, as today: `src/core/**/*.test.ts`,
`src/application/**/*.test.ts`, and the existing `js/*.test.mjs` until its
subject moves. `scripts/build-offline.mjs` and `scripts/serve-dist.mjs` stay in
`scripts/`.

Rules of the split:

- `core` owns every game rule and every projection. It may import `src/data`
  and other `core` modules only.
- `application` owns the transaction, the snapshot and the ports. It may import
  `core`. It may not import `infrastructure`, `ui` or a browser global.
- `infrastructure` implements the ports. It may import `application` types and
  `core`.
- `ui` imports `application` and `core` read-model types. It may not import
  `infrastructure`; the composition root passes the wired store down.
- `entry` imports all four and is the only module that constructs
  implementations.

### Architecture check

Decision: extend `scripts/check-types-policy.mjs` with an import-graph rule
(`checkImports`) instead of adding a fourth walker script, and extend
`scripts/check-types-policy.test.mjs` with the negative fixtures.

- Rule: parse every `import ... from "<specifier>"` in `src/**` and `js/**`,
  resolve relative specifiers to their layer, and reject a forbidden edge:
  `core → {application, infrastructure, ui, entry}`,
  `application → {infrastructure, ui, entry}`,
  `ui → {infrastructure, entry}` (except `infrastructure` type-only imports,
  which are also rejected for simplicity), and any `node:*` import outside
  `scripts/`.
- Rule: reject a browser global (`window`, `document`, `localStorage`,
  `navigator`) in `src/core` and `src/application`.
- Rule: reject `any` in `src/**`, and fail when the legacy `any` count exceeds
  the checked-in baseline.

Alternatives rejected: ESLint with `no-restricted-imports` (a large dependency
and config surface for one rule set); `dependency-cruiser` (a second graph tool
next to the existing policy walker); TypeScript project references (they prove
what compiles, not which import is legal). Cost of the chosen option: about 120
lines in an existing script plus fixtures, one CI step already present.

## Command contracts

`src/core/commands/contracts.ts` grows from the current `js/types.d.ts`.

```ts
export type CommandPayloads = {
  startNight: Record<string, never>;
  completeStep: { key: string; options?: StepOptions };
  recordVotes: { nominationId: string; voterIds: string[] };
  // …37 entries, one per registered command
};

export type CommandInput = {
  [K in keyof CommandPayloads]: { type: K; payload: CommandPayloads[K]; at?: string };
}[keyof CommandPayloads];

export type Command = {
  [K in keyof CommandPayloads]: {
    id: string; type: K; payload: CommandPayloads[K]; at: string; rulesetVersion: string;
  };
}[keyof CommandPayloads];
```

- `CommandInput` is what a screen composes. The store assigns `id`, `at` and
  `rulesetVersion`; a screen cannot forge an idempotency key.
- `payload` is required where the handler reads a field. `startNight`,
  `endNight`, `endDay`, `openNominations`, `normalizeSecrets` take
  `Record<string, never>`, so a stray field is a type error.
- `Command` is the normalized form. Only `normalizeCommand` constructs it,
  after checking the type against the registry, the payload shape and the
  ruleset version at runtime.

Result union:

```ts
type DomainAllowed = { status: "allowed"; id: string; type: CommandType;
  result: CommandResultPayload; followUp: FollowUp | null;
  events: DomainEvent[]; changes: DomainDiff | null; future: FutureView | null;
  undoable: boolean; idempotent?: boolean; at: string };

type DomainRejected = { status: "rejected"; id: string | null; type: CommandType | null;
  reason: string; errorCode: RejectionCode; errors: string[] | null };

type StorytellerChoice = { status: "requires-storyteller-choice";
  choice: { kind: "info" | "redirect" | "setup"; options: ChoiceOption[]; context: ChoiceContext };
  reason: string; errorCode: string | null };

export type DomainOutcome = DomainAllowed | DomainRejected | StorytellerChoice;

export type DispatchResult =
  | (DomainAllowed & { persisted: true })
  | (DomainRejected & { persisted: false })
  | StorytellerChoice
  | (DomainRejected & { errorCode: "persist-failed"; persisted: false });
```

- The domain returns `DomainOutcome`; it has no `persisted` field and cannot
  claim a write. `dispatch` returns `DispatchResult`: an allowed result always
  carries `persisted: true`, and a failed write is a rejection with
  `persist-failed`. This encodes the rule "never confirm an unsaved change" in
  the type system, not in a comment.
- `StorytellerChoice["choice"]["kind"]` is the closed set produced today
  (`"info"`, `"redirect"`, `"setup"`). `FollowUp` is
  `{ type: "chooseDemonHeir"; options: ...; context: ... }`, kept separate
  because it is an outcome hint, not a blocked command.
- `DomainEvent` becomes a discriminated union on `type` with a payload map. The
  event names currently emitted by `deriveEvents` are the source of that map;
  the map is enumerated once during the migration and checked against the
  emitter by a type test.
- `Effect`, `NightStep` and `Used` lose their trailing index signatures; fields
  that exist only for one edition move into an edition-specific variant
  (`NightStep & { bmr: true }`), and `NightStep` gains a discriminated `kind`.
  Until every consumer is migrated, the index signature stays on the legacy
  type only, so the new code cannot read an unknown field.

### Untrusted boundaries

`JSON.parse`, `localStorage.getItem`, an imported file and a URL response all
produce `unknown`. `src/core/model/validated.ts` exposes one producer,
`validatedFromUnknown(value: unknown)` returning
`{ ok: true; state: ValidatedState } | { ok: false; errors }`, where
`ValidatedState` is `GameState & { readonly [validated]: true }` with a
module-private `unique symbol`. That function calls the runtime validator
currently in `js/model.js`; it does not cast before validating, and when the
validator moves into `src/core` the brand moves with it. Every other module
accepts `ValidatedState`, so a bare `as GameState` cannot satisfy the type.
Runtime validation therefore cannot be replaced by an assertion.

Scope note: this brand covers the new store and command path in this change.
The legacy screens keep the current `js/types.d.ts` shapes until their routes
move, and `js/model.js` keeps its own `validateState` until the model module is
migrated. The brand is the seam, not a claim that every legacy cast is gone.

### `any` retirement

1. New `src/**` code starts at zero `any`; the policy check enforces it.
2. A module reaches zero `any` **before** it moves from `js/` to `src/`. A
   rename that keeps `any` is rejected in review, and the policy baseline
   catches a move that leaves the count unchanged only if the file also leaves
   the legacy set — so each stage lowers `LEGACY_ANY_BASELINE` in the same
   commit.
3. `Record<string, any>` becomes a named payload type or `unknown`.
4. `@ts-ignore`/`@ts-nocheck` stay forbidden; each `@ts-expect-error` keeps a
   same-line reason (`scripts/check-types-policy.mjs`).

## Store factory

```ts
export interface StorePorts {
  storage: GameStorage;            // read(): unknown | null; write(text): void; watch(cb): () => void
  preferences?: PreferenceStore;
  clock: Clock;                    // now(): Date
  random: RandomSource;            // next(): number
  ids: IdSource;                   // next(prefix?): string
  coordination?: Coordination;     // acquireWriter(): Promise<boolean>; release(): void
}

export interface GameStore {
  dispatch(input: CommandInput): DispatchResult;
  preview(input: CommandInput): DomainOutcome;
  undo(): StoreMutationResult;
  reset(count: number): StoreMutationResult;
  importGame(text: string): StoreMutationResult;
  exportGame(): string;
  getSnapshot(): GameSnapshot;      // cached, immutable, new identity per publish
  subscribe(listener: () => void): () => void;
  canUndo(): boolean;
  dispose(): void;
}

export interface GameSnapshot {
  readonly state: Readonly<ValidatedState>;
  readonly revision: number;
  readonly save: { status: "saved" | "unsaved" | "failed"; error: string | null };
}
```

Transaction, in this order and no other:

1. `normalizeCommand(input)` — fill `id`, `at`, `rulesetVersion`; reject an
   unknown type, a malformed payload or an unsupported ruleset version before
   any state read.
2. `validateCommand(state, command)` — the domain check on a draft. `rejected`
   and `requires-storyteller-choice` return here; the live state and the disk
   are untouched.
3. `applyCommand(state, command)` — the existing atomic apply on a clone,
   including the effect-graph resolution and `checkInvariants`.
4. `storage.write(serialized)` — the only write. On failure: restore the
   pre-command content, keep the failure message, return
   `{ status: "rejected", errorCode: "persist-failed", persisted: false }`, do
   not touch history, do not publish a new snapshot.
5. `publish()` — bump `revision`, replace the cached snapshot object, notify
   subscribers.

Guarantees that follow:

- A subscriber never observes a command that is not on disk.
- Because no unconfirmed local mutation can exist, adopting a newer save from
  another tab is safe. The existing behaviour stays: a valid incoming value
  replaces the state, undo history is cleared, and the writer lock keeps a
  second host tab out.
- `undo`, `reset` and `importGame` persist first and report the result. A failed
  write returns `{ ok: false, errorCode: "persist-failed" }` and leaves the
  state, the disk and the history as they were.
- The live `state` object keeps its identity and is mutated in place, so legacy
  screens that captured `state` still see updates during coexistence. The
  snapshot is a separate frozen view; `js/store.js` exports both.

Snapshot identity: `getSnapshot()` returns the cached object; only `publish()`
creates a new one. Selectors that return derived arrays must memoise on
`snapshot.revision`, otherwise `useSyncExternalStore` re-renders forever.

Alternatives rejected: wrapping the store in a React context with `useState`
(two sources of truth, and the legacy screens still need the external store);
Redux or Zustand (a dependency, a second update model, and the transaction and
rollback logic still has to be written); keeping the singleton and injecting
only in tests (the browser import still touches `localStorage`, which is the
defect being fixed).

### Determinism with injected sources

The store supplies the clock, the id source and the PRNG seed. The command path
takes an optional runtime parameter that defaults to the real browser
implementation, so the existing direct callers and tests keep working:

```ts
export interface CommandRuntime {
  clock: Clock;
  ids: IdSource;
  seed(text: string): number;
}
export function applyCommand(state, command, runtime?: Partial<CommandRuntime>): DomainOutcome;
```

One deliberate limit: `runDraft` keeps replacing the global `Math.random` for
the duration of the synchronous command and restores it in `finally`. The
domain modules call `Math.random` in several places (`js/engine/context.js` for
log ids, `js/rules.js` for a random bag), and threading a generator through
every one of them is a separate refactor with no behaviour gain. The ceiling is
recorded as a `ponytail:` comment at the replacement site: the patch is safe
because it is synchronous, single-threaded and restored before the call
returns; it must be removed if command execution ever becomes asynchronous.

Demo isolation: `js/demo.js` keeps its own `GameState` and calls the pure engine
functions directly. It must not receive the game store, and the new read-model
selectors take a state argument rather than reading a module variable — that is
how the demo stays isolated without a second global.

Preferences: one `PreferenceStore` adapter owns `pg.lang`, `pg.guided`,
`pg.sheetScenario` and `pg.sheetTravellers`, with the same `try`/`catch`
tolerance. This removes four duplicated error paths and gives the React change a
single place to read a preference.

## TypeScript configuration and test runtime

Three configurations, one command:

| File | Scope | Notable options |
|---|---|---|
| `tsconfig.json` | remaining `js/**` with `checkJs` | unchanged from the current gate |
| `tsconfig.app.json` | `src/**` | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `erasableSyntaxOnly`, `allowImportingTsExtensions`, `jsx: react-jsx`, DOM libs, `noEmit` |
| `tsconfig.core.json` | `src/core/**`, `src/application/**` | extends app, `lib: ["ES2022"]`, `types: []` — a DOM reference is an error |

`npm run typecheck` runs all three. `npm run build` runs Vite only, so a
type error cannot be hidden by a successful bundle: CI runs both.

`noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are on for `src/**`
from the first file. They stay off for `js/**` because the legacy shapes cannot
satisfy them; the flag of a migrated module is not carried over by renaming — the
module has to pass under `src/` before the move (see `any` retirement).

Test runtime: Node's built-in type stripping, no loader and no dependency.

- `node --test js src` discovers `*.test.mjs` and `*.test.ts` alike; a `.ts`
  test can import a not-yet-migrated `.js` module by its explicit path. Both
  properties were probed on the local Node before this design was written.
- Import specifiers inside `src/**` carry the `.ts` extension
  (`allowImportingTsExtensions` + `rewriteRelativeImportExtensions`), which is
  what Node requires; Vite resolves the same specifiers.
- `erasableSyntaxOnly` keeps the source inside what Node can strip: no `enum`,
  no runtime `namespace`, no parameter properties, no decorators.
- Type imports use `import type` (`verbatimModuleSyntax`), because Node strips
  without type information.
- `"type": "module"` is added to `package.json`, which removes the current
  `MODULE_TYPELESS_PACKAGE_JSON` warning and makes `.ts` files ESM without
  detection.
- `.tsx` cannot run in Node, so component behaviour is proven in the browser
  check, not in a Node test. No `jsdom`, no component-test framework.
- CI runs `node-version: 24`; the stable type-stripping floor is 24.12.0. The
  workflow pins `24` and the design records the floor.

Alternatives rejected: `tsx`/`ts-node` (a dependency that duplicates a Node
feature), a test-time Vite bundle (slow, and it would test the bundle rather
than the module), `vitest` (a framework and a transform pipeline for tests that
already run on `node:test`).

Negative compile-time tests stay in `js/types.test-d.ts` and gain `src`
counterparts: a wrong payload per command family, a rejection-only field read
without narrowing, a choice kind outside the union, an effect kind outside the
union, and a `ValidatedState` forged without validation.

## Build, Pages and routing

- `vite.config.ts`: repository root as Vite root, `publicDir: "public"`,
  `build.outDir: "dist"`, `base` from `BASE_PATH` (default `"/"`), React and
  Tailwind plugins. `sourcemap: false` for the deployed artifact.
- Scripts: `dev` (`vite`), `build` (`vite build`), `preview`
  (`vite preview`), `typecheck`, `test` (`node --test js src`),
  `offline` (`node scripts/build-offline.mjs`), `verify` (typecheck + test +
  build + offline + architecture check).
- `public/` carries `assets/img`, `assets/fonts`, `assets/data`,
  `favicon.svg`, `404.html`, `manifest.webmanifest` and `.nojekyll`. URLs stay
  `assets/img/...`, so `imageFor()`, the CSS font URLs and the catalog loader
  need no path change beyond using the configured base.
- `index.html` loses the inline `<base>` block. The boot catalog reference uses
  the base-aware URL (`%BASE_URL%`), which the first build verifies; the router
  receives its root from the entry point instead of computing it from
  `import.meta.url`.
- The worker is registered through the configured base
  (`BASE_URL + "sw.js"`), because `"./sw.js"` resolves under
  `/sheet/ru` to `/sheet/sw.js` once the `<base>` element is gone. This is a
  functional requirement of the change, not a tidy-up.
- Pages deployments run from `main` only. The build job runs `npm ci`,
  `npm run typecheck`, the test suite, `npm run build` and
  `scripts/build-offline.mjs`, then uploads `dist/`. `.nojekyll` is copied into
  `dist/` explicitly, since a dotfile in `public/` is not guaranteed to be
  copied by the bundler.
- Pull requests build and test without deploying.
- `404.html` stays the fallback and keeps `location.replace("./")`. Because
  every nested route returns 404 on Pages, the fallback is exercised on every
  deep reload.

### Proving Pages behaviour

Decision: add `scripts/serve-dist.mjs`. It serves `dist/`, answers an existing
file with 200 and an unknown path with `dist/404.html` and status 404, matching
Pages. The browser check runs against it:

- `/`, `/table`, `/sheet/ru` under the root base and under `/pocket-grimoire-go/`;
- each route after a real 404 responses, the redirect and the restored URL;
- an unknown route rendering `/table`;
- offline reload after the worker precaches.

Alternatives rejected: trusting `vite preview` (it applies an SPA fallback with
200, so it proves the opposite of Pages); trusting `scripts/serve.mjs` (same
defect); testing only the dev server.

Hash routing stays out of scope. It would change every public URL and break the
existing deep links; the `404.html` mechanism already covers the static host.

`manifest.webmanifest` keeps `scope: "./"` and `start_url: "./#/table"`. The
router's hash normalisation already turns that into `/table`; changing it is a
separate decision with its own review.

## Offline migration

The protocol is not redesigned. Only the input of the generator changes.

- Order: `vite build` → `scripts/build-offline.mjs --root dist --out dist/sw.js`
  → upload `dist/`.
- Asset list: every file under `dist/` except `sw.js` itself, plus `"./"` for
  the shell. Hashed JS and CSS chunks, every lazy chunk, all three catalogs, the
  two font files, the role images and the manifest are included because they are
  files in `dist/`.
- Cache name: hash of the asset bytes plus the generator source, first 16 hex
  characters, prefix `pg-static-`. Because `sw.js` is excluded from its own
  list, the hash is stable across builds that change nothing else.
- Activation: unchanged. `install` precaches, `activate` deletes older
  `pg-static-` caches, `SKIP_WAITING` is required, `PREPARE_UPDATE` asks every
  other window, and the page reloads once after a successful save.
- Old tabs: a tab that loaded the previous HTML keeps running its loaded
  modules; it does not mix chunks, because its own module graph is already in
  memory and its navigations are served from the cache that matches its worker.
  After activation, the next navigation takes the new shell.
- Transition from the installed worker: the source-built worker and the
  dist-built worker share the cache prefix, the message names and the scope.
  The update therefore installs, precaches the dist files and activates through
  the same gate. No close/reopen step is needed, unlike the earlier protocol
  change; the risk is recorded below.
- Recovery from a failed update: unchanged. A save failure aborts activation,
  `controllerchange` without a save keeps the current code and shows the
  recovery message, and **Later** keeps the current worker.

Alternatives rejected: `vite-plugin-pwa` with `generateSW` (it owns
`skipWaiting` and activation, so the save gate would have to be re-implemented
inside its hooks); `injectManifest` (keeps the gate but adds a plugin whose
configuration must be re-verified against a protocol we already test);
workbox runtime caching (a second cache policy next to a precache that already
covers the whole app). The existing generator is 95 lines, already tested by
`js/offline-worker.test.mjs`, and needs one argument to read a different root.

`js/offline-worker.test.mjs` changes from reading the committed root `sw.js` to
building the worker from a small fixture directory into a temporary path, then
running it in the same `vm` harness. The protocol assertions stay identical.

## React integration contract

Delivered by the next change, constrained now.

- One `GameStore` instance per window. The React tree receives it as a prop or
  through one context provider; no module-level singleton is imported by a
  component.
- `useGameStore()` wraps `useSyncExternalStore(store.subscribe, store.getSnapshot)`.
  Selectors are pure functions of `GameSnapshot`; a selector that allocates is
  memoised per `revision`.
- `getSnapshot` returns the cached object, so `Object.is` is stable and a
  render loop is impossible by construction.
- Local drafts (a half-typed name, a picked target, an open dialog) live in
  component state and are never written into `GameState`. Only a completed host
  action becomes a `CommandInput`.
- Cleanup: every subscription, timer and listener is released in an effect
  cleanup; the player self-hide timer keeps its fixed deadline across
  re-renders.
- Route ownership: exactly one system renders a route. A React route is not
  mounted while the legacy router owns it, and vice versa. The switch is a
  table in the entry point, not a runtime guess.
- The router remains path-based and keeps the link interception and
  `popstate` handling in one module; no `react-router` dependency is added for
  nine static routes.

## Tailwind coexistence contract

Delivered by the React change, constrained now.

- Tailwind enters only through `@tailwindcss/vite` and a local production
  build; no CDN, no runtime class generation.
- Class names are static string literals or entries of an enumerated map.
  `bg-${team}` is forbidden because the scanner cannot see it.
- Tokens: `@theme` carries the current palette values from `css/app.css`
  (`--bg #0c0f11`, `--panel #121619`, `--panel-2 #171d21`, `--line #232b30`,
  `--line-2 #35424b`, `--text #e6e8e4`, `--muted #8a969c`, `--accent #5fd0b4`,
  `--accent-dim #10322c`, `--danger #e08585`, the four team colours, `--radius`
  and `--pad`). One browser assertion compares a computed colour under both
  systems while they coexist.
- Preflight: skipped during coexistence. Import `theme` and `utilities` layers
  explicitly, because the default `@import "tailwindcss"` also ships Preflight,
  which would reset legacy markup. Preflight is enabled by the change that
  removes the last legacy screen, together with the base-style migration.
- Legacy CSS keeps loading unchanged; a React route renders inside its own
  subtree, and shared component styles do not depend on legacy selectors.
- Browser floor: Tailwind CSS 4 documents Safari 16.4+, Chrome 111+, Firefox
  128+. The app is already evergreen-only; the built CSS check records the
  floor instead of adding a polyfill.

## Data and localization

- `window.PG.roles` disappears from `src`. `src/data/roles-<code>.ts` exports a
  typed catalog; `src/data/role-mechanics.ts` holds the language-independent
  role id, team, edition, wake order and image name. Names, abilities and
  flavour text live in the catalog, keyed by role id. Role ids, the 72 standard
  roles and the 5 Travellers do not change.
- Catalogs are imported statically by the entry point for `ru`, `en`, `az`, so
  the bundler fingerprints them and the worker precaches them; a lazy
  `import()` stays possible for a future catalog, and the worker still covers it
  because every chunk exists at build time.
- A failed catalog load keeps the current language and shows the existing error
  path; the app does not fall back silently to a half-translated screen.
- Custom scripts keep their behaviour: a script is a list of role ids with a
  source and an edition, stored with the game and constrained by the same
  validation.
- `js/i18n.js` (the DOM text translator, 364 lines) is removed screen by
  screen: a screen that uses `t()` from `js/strings.js` no longer needs the
  `MutationObserver` translator. `scripts/strings.test` keeps proving key and
  placeholder parity; parity is not treated as proof that no literal remains,
  so the removal task greps each migrated screen for a Russian literal.
- Typed keys: `t()` accepts `keyof typeof en` and the variable map is typed per
  key, so a missing key or an unknown placeholder fails the build.

## Migration map

This change is the foundation. The rest is delivered by separate changes, each
mergeable and reversible on its own. The capability names in the last column
are proposed for those changes; they do not exist until the change that adds
them lands.

| # | Change id | Scope | Depends on | Delta capabilities |
|---|---|---|---|---|
| 1 | this change | typed commands, Vite + `dist` + Pages + offline artifact, store factory | types gate archived | `app/build-pipeline`, `app/architecture-layers`, `app/command-contracts`, `app/store-boundaries` |
| 2 | `adopt-react-ui-shell` | React root, Tailwind plugin, shared components (Button, Field, Dialog, RoleToken, PlayerSeat, save status, offline banner), router as a React store, `/sheet` migrated first | 1 | `app/ui-shell`, `app/design-tokens` |
| 3 | `migrate-setup-screens` | `/bag`, `/seat`, `/secrets` as React features over one store | 2 | `app/screen-migration` |
| 4 | `migrate-player-and-public` | `/player`, `/public` with projection-only props and the self-hide timer | 2 | `app/screen-migration` |
| 5 | `migrate-storyteller-console` | `/table` and the dialogs, split into queue, card, day, review and overlay components | 2–4 | `app/screen-migration` |
| 6 | `retire-legacy-ui` | delete `js/` screens, `js/i18n.js`, the store facade, enable Preflight, finish catalog imports, correct the docs | 5 | `app/ui-shell` (final), `app/data-catalog` |

Ordering constraint: change 2 cannot start before the store snapshot contract
is in place, because the React tree reads the store and not the module
singleton. Changes 3–5 are independent of each other after 2; each touches its
own routes and can land in any order. Change 6 lands last by definition.

Not planned, and rejected unless a new requirement appears: Storybook (a second
build and a second dependency tree for seven components), a component library,
`react-router`, a state-management package, SSR, and a second package inside
the repository.

## Compatibility, rollback and recovery

- Saves: key, schema, envelope, migrations and player ids are untouched. A save
  written by the new build loads in the previous build and the reverse, which is
  what makes a code rollback safe.
- Rollback: revert the Pages deployment to the previous artifact and bump the
  build hash so the worker updates. A client that already activated the new
  worker keeps the new cache until it activates the reverted one; the save is
  compatible either way, so no game is lost.
- The one behaviour correction (`undo`/`reset`/`importGame` reporting a failed
  write) is exercised by a new `js/store.test.mjs` case. The UI shows the
  existing storage error; no new copy is required beyond the message that
  already exists.
- A corrupt save, an unknown version and a failed write keep the current
  handling: a timestamped backup key, a fresh game with a visible error, and a
  memory-only state that never claims to be saved.
- A failed migration keeps both the game and the backup; the new store must not
  delete a backup it did not create.

## Risks

1. **Chunk names change on every build, so the worker hash changes on every
   release.** Intended; the cost is a full precache per release, exactly as
   today.
2. **A stale `public/` directory from the old workflow.** The directory changes
   meaning. The workflow drops its staging step and `.gitignore` gains `dist/`;
   a local `public/` copied from the old instructions is not committed.
3. **The `<base>` removal can break relative URLs in a screen that relied on
   it.** Mitigation: every computed asset URL goes through one helper, and the
   browser check covers `/sheet/ru` and `/player` under a subpath.
4. **The router root from `import.meta.url` breaks when the bundle moves.**
   Mitigation: the root is injected by the entry point; the module never
   infers it.
5. **Node type stripping rejects a syntax that a contributor adds.** Mitigation:
   `erasableSyntaxOnly` fails the type check first, and the error names the
   construct.
6. **The transition from the installed source-built worker.** Same prefix,
   scope and messages keep it compatible. If a client is stuck, the recovery is
   the existing one: close and reopen the installed app.
7. **`noUncheckedIndexedAccess` exposes latent bugs in migrated code.**
   Mitigation: enable it per `src` file set from the start; a legacy module
   moves only after it passes.
8. **Two UIs during migration could diverge.** Mitigation: one store, one owner
   per route, and a browser check that dispatches from one route and reads the
   result on another.
9. **The delta specs cite test files that exist today but whose new cases do
   not.** The `openspec-check` contract verifies resolvability and says so; the
   review of each task's RED/GREEN evidence is what proves the assertion. No
   requirement is claimed as verified before its test lands.

## Open questions

1. TypeScript 7 (registry latest `7.0.2`) versus the pinned `5.9.3`. The
   proposal keeps `5.9.3`; adopting 7 needs its own verification of
   `allowJs`/`checkJs`, `erasableSyntaxOnly` and the two extra strictness flags.
2. Custom domain versus project subpath. The design supports both through
   `BASE_PATH`; the owner decides whether a `CNAME` is planned, because it
   changes the Pages base and the `404.html` redirect target.
3. Whether the installed app should start on `/table` (`start_url: "./table"`)
   instead of the hash form. Not changed here; it is a product decision with an
   install-update side effect.

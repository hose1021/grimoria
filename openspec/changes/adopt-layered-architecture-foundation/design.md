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
    ports/                    Clock, RandomSource, IdSource (type-only, no browser)
    model/                    state v4, defaults, projections, migration, validation
    rules/                    role catalogs, composition, night order, script parsing
    engine/                   night, day, death, effects, information, bmr, sv, corrections
    effect-graph/             poison and drunk dependency resolution
    commands/                 registry, contracts, prepare, adopt, validate, preview, apply
  application/
    ports/                    GameStorage, Coordination, PreferenceStore
    store/                    createGameStore, history, snapshot, save status, subscriptions
    dispatch/                 transaction orchestration and the legacy command adapter
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
public/                       copied verbatim: assets/, favicon.svg,
                              manifest.webmanifest
dist/                         build output, generated, not committed; carries
                              the generated 404.html and sw.js
```

Tests stay beside the modules they exercise, as today: `src/core/**/*.test.ts`,
`src/application/**/*.test.ts`, and the existing `js/*.test.mjs` until its
subject moves. `scripts/build-offline.mjs`, `scripts/build-fallback.mjs` and
`scripts/serve-dist.mjs` stay in `scripts/`.

Rules of the split:

- `core` owns every game rule and every projection. It may import `src/data`,
  other `core` modules and the type-only core ports. It declares `Clock`,
  `RandomSource` and `IdSource`, because the command path needs them and
  `core` may not import `application`.
- `application` owns the transaction, the snapshot, the storage and
  coordination ports and the legacy adapter. It may import `core`. It may not
  import `infrastructure`, `ui` or a browser global.
- `infrastructure` implements both port sets. It may import `application` and
  `core` types.
- `ui` imports `application` and `core` read-model types. It may not import
  `infrastructure`; the composition root passes the wired store down.
- `entry` imports all four and is the only module that constructs
  implementations.

### Source sets

Two disjoint sets, because a test imports `node:test` while production must not
see a Node API:

| Set | Files | Checked by | Node types | DOM types |
|---|---|---|---|---|
| production | `src/**/*.ts`, `src/**/*.tsx` minus tests and fixtures | `tsconfig.app.json` | no | yes |
| production core | `src/core/**`, `src/application/**` | `tsconfig.core.json` | no | no |
| tests | `src/**/*.test.ts`, `src/**/*.test-d.ts` | `tsconfig.test.json` | yes | no |
| legacy | `js/**` | `tsconfig.json` (`checkJs`) | no | yes |

`tsconfig.core.json` and `tsconfig.app.json` exclude `**/*.test.ts`,
`**/*.test-d.ts` and `**/test-fixtures/**` explicitly. The exclusion is an
acceptance point in the task list, because a forgotten exclusion silently puts
`node:test` types into the production gate.

### Architecture check

Decision: extend `scripts/check-types-policy.mjs` with an import-graph rule
(`checkImports`) instead of adding a fourth walker script, and extend
`scripts/check-types-policy.test.mjs` with the negative fixtures.

Specifier extraction SHALL cover every static form:

- `import x from "s"`, `import { a, b } from "s"`, `import * as m from "s"`;
- `import "s"` (side effect);
- `export { a } from "s"`, `export * from "s"`, `export * as m from "s"`;
- `import type ... from "s"` and `import { type T } from "s"`;
- `import("s")` with a single string literal.

A dynamic `import()` whose argument is not a single string literal is a
violation in `src/core` and `src/application`; in `src/ui` it is reported as
unresolved, because a lazy route may compute a chunk specifier. Specifiers are
classified as `relative`, `core`, `application`, `infrastructure`, `ui`,
`data`, `entry`, `node:` or `external`. There are no `paths` aliases: a bare
specifier in `core` or `application` is a violation, so alias resolution cannot
hide an edge.

Rules for non-test files:

- reject `core → {application, infrastructure, ui, entry}`;
- reject `application → {infrastructure, ui, entry}`;
- reject `ui → {infrastructure, entry}`;
- reject any `node:*` import outside `scripts/` and outside test files;
- reject an import of a path matching `*.test.ts`, `*.test-d.ts` or
  `**/test-fixtures/**` (test code must not leak into production);
- reject a browser global (`window`, `document`, `localStorage`, `navigator`)
  in `src/core` and `src/application`;
- reject `any` in `src/**` and fail when the legacy `any` count exceeds the
  checked-in baseline;
- reject `as ValidatedState` and `as unknown as` outside
  `src/core/model/validated.ts` and `src/application/dispatch/adopt.ts`.

Rules for test files:

- a `core` test may not import `infrastructure`, so the pure tests stay
  runnable without a browser adapter;
- a test file may import `node:*`, its own production modules and any `src`
  production module the rule above allows;
- test files are walked by the same scan, so a fixture proves that a violation
  inside a test is reported.

Limit: the scan is textual and line-based, like the existing policy. It proves
that the listed forms are classified and that the forbidden edges are reported;
it cannot prove that no bypass exists (a cast through a helper, `Object.assign`,
or a specifier built at runtime and passed to a dynamic import in `ui`). Review
of the import graph is the second line. The task records this limit instead of
claiming a total guarantee.

Alternatives rejected: ESLint with `no-restricted-imports` (a large dependency
and config surface for one rule set); `dependency-cruiser` (a second graph tool
next to the existing policy walker); TypeScript project references (they prove
what compiles, not which import is legal). Cost of the chosen option: about 180
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

// What a caller composes. `id`, `at` and `rulesetVersion` are boundary inputs:
// a legacy screen, a test or an imported action may supply them, and prepare
// preserves them. In-repo UI code has no reason to.
export interface CommandInput<K extends CommandType = CommandType> {
  type: K;
  payload: CommandPayloads[K];
  at?: string;
  id?: string;
  rulesetVersion?: string;
}

// The one normalized envelope. Produced by prepareCommand() or
// adoptPrepared(), never by a caller directly.
export interface PreparedCommand<K extends CommandType = CommandType> {
  readonly id: string;
  readonly type: K;
  readonly payload: CommandPayloads[K];
  readonly at: string;
  readonly rulesetVersion: string;
  readonly fingerprint: string;
}

export type PrepareResult =
  | { ok: true; command: PreparedCommand }
  | { ok: false; errorCode: PrepareRejectionCode; reason: string };

export function prepareCommand(
  input: CommandInput,
  ports: { ids: IdSource; clock: Clock }
): PrepareResult;
export function adoptPrepared(value: unknown): PrepareResult; // external JSON
```

`CommandInput` is a proposal, not an identity. The identity exists only after
`prepareCommand`, and every later call reuses that one object:

```ts
export interface GameStore {
  prepare(input: CommandInput): PrepareResult;   // pure; allocates identity
  preview(command: PreparedCommand): DomainOutcome; // no mutation, no allocation
  dispatch(command: PreparedCommand): DispatchResult; // the only persisting call
  // …
}
```

Ownership, answered once and for all:

| Value | Created by | When | Preserved from the input |
|---|---|---|---|
| `id` | `prepareCommand` via `IdSource.next()` | once per prepared command | `input.id` when present, unchanged |
| `at` | `prepareCommand` via `Clock.now()` | once per prepared command | `input.at` when present, unchanged |
| `rulesetVersion` | `prepareCommand` | once per prepared command | `input.rulesetVersion` when present; unsupported is rejected |
| `fingerprint` | `prepareCommand` | once, from type, payload and rulesetVersion | never |
| PRNG seed | `runDraft`, inside each `preview` and `dispatch` | per call, from id, fingerprint and the canonical hash of the current state | never |

Consequences, all testable:

- **Preview → apply.** The same prepared command carries the same `id`, `at`
  and `fingerprint` into both calls, so preview and dispatch agree on identity
  and on the clock. The module-level `previewTimestamps` map is removed,
  because no call allocates a timestamp any more.
- **Retry.** Dispatching the same prepared object twice is a retry. The
  idempotency ledger answers: the same id with the same fingerprint returns
  `allowed` with `idempotent: true` and no second change; the same id with a
  different fingerprint is rejected with `command-id-conflict`.
- **New action, same payload.** Calling `prepare` again produces a new id. Two
  identical-looking actions (two separate nominations, two corrections) are two
  commands, not a retry.
- **Changed state between preview and dispatch.** A preview is not a
  reservation. `dispatch` re-validates and re-applies against the current
  state, so it may reject or report different events. The seed includes the
  state hash for exactly that reason. The store does not replay a preview.
- **Legacy path.** `applyCommand(state, command)` keeps its current timestamp
  resolution for callers that pass no `at`, so `game/command-engine` behaviour
  is unchanged. The store path always hands it a prepared command that already
  has `at`, so that resolution is never used there.
- **External commands.** A value from `JSON.parse`, storage or a test enters
  through `adoptPrepared(value: unknown)`, which validates the envelope fields
  and recomputes the fingerprint; a mismatch is rejected. `dispatch` validates
  the envelope again before it reads state.
- **Trust boundary.** The typed input shape guides in-repo callers; it is
  not a security control. Any object can be forged at runtime, which is why
  `adoptPrepared` and `dispatch` validate instead of trusting the type.

`payload` is required where the handler reads a field. `startNight`,
`endNight`, `endDay`, `openNominations` and `normalizeSecrets` take
`Record<string, never>`, so a stray field is a type error.

A prepared command is immutable by contract: `preview` and `dispatch` never
write to it, and a rejection leaves it reusable.

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
module-private `unique symbol`.

What the brand does and does not do:

- It rejects an ordinary assignment: a `GameState` value cannot be passed where
  `ValidatedState` is required, and `unknown` cannot be narrowed by assignment.
- It does **not** reject an assertion. On the pinned TypeScript 5.9.3,
  `{} as ValidatedState`, `raw as ValidatedState` and
  `raw as unknown as ValidatedState` all compile, because a `unique symbol` is
  a nominal marker, not an access control. A brand is a guide for well-behaved
  code, nothing more.
- The runtime validator is the real barrier. A forged value reaches the ledger
  with corrupt data and fails at the first domain read, which is worse than
  failing at the boundary; that is why validation stays mandatory.
- The remaining protection is a policy plus review: `as ValidatedState` and
  `as unknown as` are permitted only inside `src/core/model/validated.ts` (the
  validator) and `src/application/dispatch/adopt.ts` (the external command
  adapter), and `scripts/check-types-policy.mjs` fails on either token
  elsewhere in `src/`.
- Limit of that policy: it is textual. It cannot prove the absence of a bypass
  built from a helper, a generic identity function, `Object.assign`, or an
  object assembled at runtime. It narrows the surface and makes an accidental
  cast visible in review; it does not make assertions safe, and this design
  does not claim that it does.

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
// declared in src/core/ports — pure types, no browser
export interface Clock { now(): Date }
export interface RandomSource { seed(text: string): number }
export interface IdSource { next(prefix?: string): string }

// declared in src/application/ports
export interface StorePorts {
  storage: GameStorage;          // read(): unknown | null; write(text): void; watch(cb): () => void
  preferences?: PreferenceStore;
  clock: Clock;
  ids: IdSource;
  random: RandomSource;          // seed(text) => the command path's PRNG seed
  coordination?: Coordination;
}

export interface GameStore {
  prepare(input: CommandInput): PrepareResult;
  preview(command: PreparedCommand): DomainOutcome;
  dispatch(command: PreparedCommand): DispatchResult;
  persist(): SaveOutcome;
  undo(): StoreMutationResult;
  reset(count: number): StoreMutationResult;
  replaceState(next: ValidatedState): StoreMutationResult;
  importGame(text: string): StoreMutationResult;
  exportGame(): string;
  getSnapshot(): GameSnapshot;
  subscribe(listener: () => void): () => void;
  canUndo(): boolean;
  hasLocalChanges(): boolean;
  clearSaveError(): void;
  dispose(): void;
}

export type StoreMutationResult =
  | { ok: true; snapshot: GameSnapshot }
  | { ok: false; errorCode: "persist-failed"; error: string; snapshot: GameSnapshot };

export interface GameSnapshot {
  readonly state: Readonly<ValidatedState>; // always the last persisted state
  readonly gameRevision: number;            // == state.revision; moves only with the written game
  readonly viewVersion: number;             // moves on every publish, including save status
  readonly save: SaveStatus;
}

export type SaveStatus =
  | { status: "saved" }
  | { status: "failed"; errorCode: "persist-failed"; error: string; at: string };
```

Two identities, deliberately:

- `gameRevision` is the game. It changes only when a new state is written, and
  equals `state.revision`, which is part of the serialized value.
- `viewVersion` is the snapshot. It changes on a game publish and on a
  save-status publish, so a listener can re-render a banner without pretending
  the game moved.

Transaction, in this order and no other:

1. `prepareCommand(input)` — allocates or preserves `id`, `at` and
   `rulesetVersion`, computes the fingerprint, rejects an unknown type, a
   malformed payload or an unsupported ruleset version before any state read.
2. `validateCommand(state, command)` — the domain check on a draft. `rejected`
   and `requires-storyteller-choice` return here; the live state and the disk
   are untouched.
3. `applyCommand(state, command)` — the atomic apply on a clone, including the
   effect-graph resolution and `checkInvariants`.
4. `storage.write(serialized)` — the only write of the game. On success
   `state.revision` becomes the written revision. On failure: restore the
   pre-command content, keep `gameRevision` unchanged, set `save` to `failed`
   and publish a save-status snapshot. Return
   `{ status: "rejected", errorCode: "persist-failed", persisted: false }`.
   Do not touch history.
5. `publish()` — replace the cached snapshot object, increment `viewVersion`,
   notify subscribers.

Save-status rules:

- A persist failure publishes a new snapshot with the **same state reference**,
  the **same `gameRevision`**, `save: { status: "failed", … }` and
  `viewVersion + 1`, and notifies subscribers. The UI must see the error. The
  prohibition is on publishing the unconfirmed draft, not on publishing the
  failure.
- A repeated failure with an identical message does not publish a second
  snapshot: `viewVersion` stays, so a retry loop cannot churn the renderer. A
  different message publishes.
- A later successful write (`persist`, `saveIfNeeded`, the next accepted
  command) clears the error: `save` becomes `saved`, `gameRevision` follows the
  written revision, `viewVersion + 1`.
- `clearSaveError()` (the legacy `acknowledgeStorageError`) also publishes,
  with the same state and `save: { status: "saved" }`.
- The legacy banner keeps its channel: the facade copies `save.error` into
  `state.storageError` before notifying, so `js/app.js` and its subscriber see
  exactly what they see today.

Guarantees that follow:

- A subscriber never observes a game state that is not on disk: the state is
  either the last write or the last persisted state with a `failed` save
  status.
- A subscriber always observes the current save status.
- The serialized value contains the revision that `gameRevision` reports; a
  failed write advances neither.
- Because no unconfirmed local mutation is published, adopting a newer save from
  another tab stays safe. The existing behaviour remains: a valid incoming
  value replaces the state, undo history is cleared, the writer lock keeps a
  second host tab out.
- `undo`, `reset`, `replaceState` and `importGame` persist first and report the
  result. A failed write returns `{ ok: false, errorCode: "persist-failed" }`
  with the unchanged state, disk and history, and publishes the failure.
- The live `state` object keeps its identity and is mutated in place, so legacy
  screens that captured `state` still see updates during coexistence. The
  snapshot is a separate frozen view; `js/store.js` exports both.

Snapshot identity: `getSnapshot()` returns the cached object; only `publish()`
creates a new one. A game selector memoises on `snapshot.state` and
`gameRevision`; a banner selector reads `snapshot.save`; neither can loop,
because identity changes only at a publish.

### Legacy facade contract

`js/store.js` keeps its current shape for every export a screen uses.
"Unchanged" means the legacy caller cannot tell the difference.

| Export | Today | Factory | Facade conversion | On persist failure | Callers to check |
|---|---|---|---|---|---|
| `state` | live object | `getSnapshot().state` | same live object, mutated in place | unchanged; `state.storageError` set | every screen |
| `subscribe` | `() => boolean` | `subscribe(listener): () => void` | return the unsubscribe function | still notified (save status) | `js/app.js`, `js/public.js` |
| `dispatch` | result object | `dispatch(prepared)` | `toCommandInput` → `prepare` → `dispatch` | rejected `persist-failed` | `table`, `player`, `seat`, `secrets` |
| `save` | `boolean` | `persist(): SaveOutcome` | `outcome.ok` | `false`, error visible | `js/log.js`, tests |
| `saveIfNeeded` | `boolean` | `hasLocalChanges` + `persist` | `boolean` | `false` | `js/offline.js` |
| `undo` | `boolean` | `StoreMutationResult` | **`result.ok`** (boolean) | `false`; the legacy `if (undo())` branch does not run | `js/table.js:1341`, tests |
| `canUndo` | `boolean` | `boolean` | direct | unchanged | `js/table.js` |
| `reset` | state object | `StoreMutationResult` | typed result; no screen reads it | `{ ok: false }`, state and disk unchanged | tests prepare only |
| `replaceState` | state object | `StoreMutationResult` | typed result; no screen reads it | `{ ok: false }` | tests |
| `importGame` | `{ ok }` / `{ ok: false, error }` | `StoreMutationResult` | map to the existing shape | `{ ok: false, error }` | `js/store.test.mjs` |
| `exportGame` | `string` | `string` | direct | unchanged | `js/table.js` |
| `run` | mutator result + `persisted` | legacy shim over `dispatch` | unchanged shape | `persisted: false` | tests only |
| `acknowledgeStorageError` | `void` | `clearSaveError()` | call and notify | clears the banner | none outside the store |
| `hasLocalChanges` | `boolean` | `boolean` | direct | unchanged | none outside the store |
| `loadStatus` | object | derived from the initial load | same object shape | reports the load problem | `js/store.test.mjs`, `js/app.js` |

The critical row is `undo`: the typed result must never reach `if (undo())`
directly. The facade returns a boolean and exposes the error through the save
status, so the legacy screen keeps working without an edit.

Alternatives rejected: wrapping the store in a React context with `useState`
(two sources of truth, and the legacy screens still need the external store);
Redux or Zustand (a dependency, a second update model, and the transaction and
rollback logic still has to be written); keeping the singleton and injecting
only in tests (the browser import still touches `localStorage`, which is the
defect being fixed).

### Determinism with injected sources

The store supplies the clock and the PRNG seed; the identity is already in the
prepared command. The command path takes an optional runtime parameter that
defaults to the real implementation, so the existing direct callers and tests
keep working:

```ts
export interface CommandRuntime {
  clock: Clock;            // resolves `at` only on the legacy path
  random: RandomSource;    // random.seed(text) feeds the deterministic PRNG
}
export function applyCommand(
  state: GameState,
  command: PreparedCommand,
  runtime?: Partial<CommandRuntime>
): DomainOutcome;
```

`applyCommand` allocates nothing: the id, timestamp and ruleset version arrive
in the command. `ids` is needed only by `prepareCommand`.

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

Four configurations, one command; the sets are defined in "Source sets".

| File | Scope | Notable options |
|---|---|---|
| `tsconfig.json` | remaining `js/**` with `checkJs` | unchanged from the current gate |
| `tsconfig.app.json` | production `src/**` minus tests and fixtures | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `erasableSyntaxOnly`, `allowImportingTsExtensions`, `rewriteRelativeImportExtensions`, `jsx: react-jsx`, DOM libs, `types: []`, `noEmit` |
| `tsconfig.core.json` | production `src/core/**`, `src/application/**` | extends app, `lib: ["ES2022"]`, `types: []`, no DOM |
| `tsconfig.test.json` | `src/**/*.test.ts`, `src/**/*.test-d.ts` | extends app minus DOM, `types: ["node"]`, the same strict flags |

- `npm run typecheck` runs all four. `npm run build` runs Vite only, so a type
  error cannot be hidden by a successful bundle: CI runs both.
- `@types/node` (major 24, pinned in the lockfile) is a devDependency used only
  by `tsconfig.test.json`. It is a type package: it adds no runtime code, no
  bundle entry and no change to the browser artifact.
- The production configurations keep `types: []`. Adding `"node"` there is a
  review error, and a `node:` import in production fails the architecture check
  even before the compiler sees it.
- `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are on for
  `src/**` from the first file. They stay off for `js/**` because the legacy
  shapes cannot satisfy them; a migrated module has to pass under `src/` before
  the move (see `any` retirement).

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
union, and an assignment of an unvalidated `GameState` to `ValidatedState`.
There is no negative type test for a cast, because TypeScript accepts it; the
assertion rule is enforced by the policy scan and review instead.

## Build, Pages and routing

### One base path, normalized once

`BASE_PATH` is the single source of the application base. It is read at config
time and normalized to exactly one leading slash and one trailing slash, with
repeated slashes collapsed: `""` and `"/"` become `"/"`, while
`"pocket-grimoire-go"` and `"/pocket-grimoire-go/"` both become
`"/pocket-grimoire-go/"`. The same value feeds four consumers, so they cannot
disagree:

1. Vite `base`, which also exposes it as `import.meta.env.BASE_URL`;
2. the router root, passed by the entry point (`start({ root, handler })`) and
   never derived from `import.meta.url`;
3. the `404.html` fallback, generated with the value inlined;
4. the service-worker registration URL (`BASE_PATH + "sw.js"`) and every
   computed asset URL.

`index.html` loses the inline `<base>` block. The boot catalog reference uses
`%BASE_URL%`, which Vite substitutes from the same value; the first build
verifies the substitution (fallback: an absolute public path, which Vite also
rewrites).

Computed asset URLs go through one helper, `assetUrl(path)` in `js/ui.js`
(moving to `src/ui/assets.ts` with the React change), which prefixes the
normalized base. The sites that must migrate when `<base>` disappears:
`imageFor()` and `imageName()` in `js/roles.js`, the catalog `<script>` src in
`js/roles.js`, `%BASE_URL%` for the boot catalog, the worker registration in
`js/offline.js`, and `path()` in `js/router.js`. A browser check under the
project subpath proves that no request fell back to `/assets/...` at the root.

### The fallback page and the redirect

`dist/404.html` is generated by `scripts/build-fallback.mjs` from a template
with the normalized base inlined. It is not copied from `public/`, because a
public file is copied verbatim and cannot receive the base.

The page does exactly this:

1. read the inlined `base`;
2. read `pathname + search`;
3. if `pathname` equals `base`, do not redirect: the shell itself is missing
   and another redirect would loop; render a short message instead;
4. if `pathname` starts with `base`, keep the remainder only when it contains
   no `..`, no `//`, no backslash and no scheme, and store `pathname + search`
   under `pg.redirect` in `sessionStorage`;
5. replace the location with `base` — always the configured root, never `"./"`
   and never a parent of the current URL.

The router restores the stored value only when it starts with the same
normalized base; it strips the trailing slash at the route level, removes
`pg.redirect` before navigating and discards a value outside the base.
`pg.redirect` is a same-origin navigation aid, never a redirect target that
bypasses the base check.

Consequences, stated because the old rule was the defect:

- `/pocket-grimoire-go/sheet/ru` → `404.html` → `/pocket-grimoire-go/` → app
  boots → `/sheet/ru` restored. One redirect, no loop.
- `/pocket-grimoire-go/sheet/` resolves to the same route as `/sheet`; the
  route parser strips the trailing slash.
- `…/table?x=1` keeps its query on the restored URL.
- An unknown route inside the base is restored and renders `/table`, as today.
- A path outside the base is never stored, so the fallback cannot bounce a
  visitor to another site.
- A cold start with no service worker takes the same path: the browser requests
  the route, the host answers 404 with this document, the redirect runs.

Offline, a controlled page never reaches the fallback for a navigation: the
worker answers navigations from the cached shell, as it does today.

### Build configuration and scripts

- `vite.config.ts`: repository root as Vite root, `publicDir: "public"`,
  `build.outDir: "dist"`, `base` from the normalized `BASE_PATH`,
  `sourcemap: false`. No framework plugin in this change.
- Scripts: `dev` (`vite`), `build` (`vite build`), `preview` (`vite preview`),
  `typecheck` (four `tsc` runs), `test` (`node --test js src`),
  `fallback` (`node scripts/build-fallback.mjs --root dist`),
  `offline` (`node scripts/build-offline.mjs --root dist --out dist/sw.js`),
  `verify` (typecheck + test + build + fallback + offline + architecture
  check).
- `scripts/build-offline.mjs` requires `--root` and `--out`; there is no
  default source root. A caller that forgets the flag fails loudly instead of
  precaching the source tree after a Vite build.
- `public/` carries `assets/img`, `assets/fonts`, `assets/data`,
  `favicon.svg`, `manifest.webmanifest` and `.nojekyll`. It does not carry
  `404.html`; the committed root `404.html` is deleted when the generated one
  lands, because a second fallback document would be dead code.
- Pages deployments run from `main` only: `npm ci`, `npm run typecheck`, the
  tests, `npm run build`, `npm run fallback`, `npm run offline`, then upload
  `dist/`. `.nojekyll` is copied into `dist/` explicitly, since a dotfile in
  `public/` is not guaranteed to be copied.
- Pull requests run the same steps without deploying.

### Proving Pages behaviour

`scripts/serve-dist.mjs` serves `dist/` under an optional `--prefix`: an
existing file answers 200, an unknown path answers `dist/404.html` with status
404, and it never applies an SPA fallback. The browser check runs against it
and records, for every case, the status of the first response, the redirect
count and the final URL:

| Case | Base | Expected |
|---|---|---|
| cold open of `/` | root and subpath | 200, app boots |
| cold open of `/table` | root and subpath | 404, one redirect, `/table` rendered |
| cold open of `/sheet/ru`, `/sheet/en`, `/sheet/az` | root and subpath | 404, one redirect, the sheet renders |
| `/table/` (trailing slash) | root and subpath | the same route as `/table` |
| `/table?x=1` | root and subpath | query preserved on the restored URL |
| unknown route | root and subpath | renders `/table` |
| path outside the base | subpath | not stored, no cross-app redirect |
| redirect loop | every case | at most one 404 response per navigation |
| offline reload | root and subpath | cached shell, no 404 |

"Cold open" means a fresh browser context with no service worker and no
`sessionStorage`, so the fallback is exercised rather than the worker.

Alternatives rejected: keeping `location.replace("./")` (it resolves
`/pocket-grimoire-go/sheet/ru` to `/pocket-grimoire-go/sheet/`, which is the
same 404 document, so the page loops); deriving the base from the 404
document's own URL (the document is served for arbitrary paths, so its parent
is the failing route); trusting `vite preview` or `scripts/serve.mjs` (both
answer 200 with an SPA fallback and prove the opposite of Pages).

Hash routing stays out of scope. It would change every public URL and break the
existing deep links; the `404.html` mechanism covers the static host.

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
`js/offline-worker.test.mjs`, and requires `--root` plus `--out` so it cannot
default to the source tree after a build.

`js/offline-worker.test.mjs` changes from reading the committed root `sw.js` to
building the worker from a small fixture directory into a temporary path, then
running it in the same `vm` harness. The protocol assertions stay identical.

## React integration contract

Delivered by the next change, constrained now.

- One `GameStore` instance per window. The React tree receives it as a prop or
  through one context provider; no module-level singleton is imported by a
  component.
- `useGameStore()` wraps `useSyncExternalStore(store.subscribe, store.getSnapshot)`.
  Selectors are pure functions of `GameSnapshot`. A game selector memoises on
  `snapshot.state` and `gameRevision`; a save-status selector reads
  `snapshot.save`. `viewVersion` exists so a status-only publish can rerender a
  banner without invalidating every game selector.
- `getSnapshot` returns the cached object, so `Object.is` is stable and a
  render loop is impossible by construction.
- Local drafts (a half-typed name, a picked target, an open dialog) live in
  component state and are never written into `GameState`. A completed host
  action is `prepare`d once and that `PreparedCommand` is passed to `preview`
  and `dispatch`, so a retry keeps its identity and a new click gets a new
  one.
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
   it.** Mitigation: one `assetUrl()` helper, a named list of the five call
   sites to migrate, and a browser check that fails on a request to `/assets/…`
   at the root while the app is served under a subpath.
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
10. **The fallback page needs the base at build time.** A forgotten generation
    step leaves the old redirect in `dist/`. Mitigation: `npm run fallback` is
    part of `verify` and of both pipelines, and the browser check fails when a
    navigation produces more than one 404 response.
11. **Save-status publication can churn the renderer.** Mitigation: an
    identical repeated failure does not publish a new snapshot, `viewVersion`
    separates status from game identity, and game selectors memoise on
    `state`/`gameRevision`.
12. **`ValidatedState` is not an access control.** Mitigation: runtime
    validation stays the only producer, the policy scan confines `as
    ValidatedState` and `as unknown as` to two files, and the design states the
    residual bypass surface instead of claiming a guarantee.

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

# Architecture

One static application, built by Vite into `dist/` and deployed to GitHub Pages.
No backend, no runtime dependency beyond the bundled code.

## Layers

```mermaid
flowchart LR
  boot["src/entry<br/>composition root"] --> shell["src/ui<br/>React shell"]
  boot --> store["js/store.js<br/>store facade"]
  boot --> infra["src/infrastructure<br/>storage, platform,<br/>preferences"]
  shell --> legacy["js/ screens<br/>(legacy, via bridge)"]
  shell --> app["src/application<br/>store, ports, read models"]
  legacy --> store
  store --> app
  infra --> app
  app --> core["src/core<br/>commands, model, ports"]
  core --> data["src/data<br/>(catalogs)"]
```

| Layer | Owns | May import |
|---|---|---|
| `src/core` | game rules, command contracts and preparation, validated state, typed events, core ports | `core`, `src/data`, type-only legacy types |
| `src/application` | store transaction, snapshots, application ports, read models, legacy command adapter | `core` |
| `src/infrastructure` | localStorage storage, platform clock/ids/seed, preferences | `application`, `core` |
| `src/ui` | React shell, router store, legacy bridge, shared components, native screens, Tailwind entry and tokens | `core` (types), `application` (snapshot type), React, Radix |
| `js/` screens | legacy DOM screens and the engine until they migrate | `application` (through the facade), `core` |
| `src/entry` | composition root: imports the legacy screens, loads the locale and builds the shell ports | everything |

The policy scan (`scripts/check-types-policy.mjs`) enforces the direction, the
production/test split, every static import form, the ban on `node:` outside
scripts and tests, the `any` ratchet and the restricted assertions. It is a
textual scan; review remains the second control.

## Engine access

`src/application` imports `src/core` directly: the store calls
`validateCommand`, `previewCommand` and `applyCommand` from `src/core/engine`,
and `createGame`, `importGame`, `exportGame` and `validateState` from
`src/core/model`. `src/application/dispatch/adopt.ts` is the one module that
converts the engine result union to the typed store result, and
`validatedFromUnknown` is the only path that turns raw data into a game state.
`js/composition.js` and the two transitional ports are gone.

## Store transaction

```text
prepare(input)            core: id, at, rulesetVersion, fingerprint
validate(state, command)  executor: domain check on a draft
apply(state, command)     executor: mutates the live object only on success
persist()                 storage: revision, serialized value
publish()                 new snapshot, viewVersion + 1, notify
```

- Rejected or Storyteller-choice commands return before apply; nothing changes.
- A failed write restores the pre-command clone and publishes only
  `save.status = "failed"` with the unchanged game and revision.
- `getSnapshot()` returns the cached object; identity changes only at publish.
  `gameRevision` is the written revision; `viewVersion` moves on every publish.

## Save compatibility

`pg.game.v4` is the single key. The stored shape, the export envelope, the v2/v3
migration, the v3 default-name cleanup, stable player ids and `state.order` are
unchanged; the codec owns them until they move into `core`.

## Facade

`js/store.js` exports what the screens use: live `state`, `subscribe`,
`dispatch`, `save`, `saveIfNeeded`, `hasLocalChanges`, `undo` (boolean),
`canUndo`, `run`, `reset`, `replaceState`, `exportGame`, `importGame`,
`acknowledgeStorageError`, `loadStatus`, `playerById`, `orderedPlayers`,
`living`. The typed store keeps its results; the facade adapts them.

## UI shell

- `src/entry/main.ts` is the only module that imports both trees. It loads the
  saved locale, starts the shared router, builds `ShellPorts` (router, game
  source, role catalog, commands, strings, locale, assets, preferences,
  legacy screens) and mounts `src/ui/main.tsx`.
- `src/ui/router.ts` is a small store over the History/`popstate` subscription:
  a stable `{ path, previousPath, version }` snapshot where `version` advances on
  every dispatch and `previousPath` only on a real path change, so a bridge
  remounts exactly where the legacy router remounted a screen and the shell can
  gate a private hand-off.
- `src/ui/shell.tsx` resolves the path: `/sheet`, `/player`, `/public`, `/bag`,
  `/seat`, `/secrets` and `/table` render native screens, every other path
  renders `legacy-bridge.tsx`, and an unknown path falls back to `/table`. The
  bridge renders the hand-back cover after a private route and calls the legacy
  `mount` and cleanup in the same effect.
- `src/ui/store/use-game.ts` is `useSyncExternalStore` over the store's cached
  snapshot. Identity changes only at publish, so there is no second state copy.
- `src/ui/styles/shell.css` imports the Tailwind theme and utilities into
  explicit layers and never imports Preflight; the legacy stylesheets stay
  unlayered and keep winning. Utilities are scanned from `src/ui` and the
  top-level legacy screen modules (`js/*.js`), never from tests or the locale
  catalogs (`source(none)` plus explicit `@source`). `tokens.css` mirrors the
  `css/app.css` `:root` values in one `@theme` block; the policy scan fails on a
  missing or changed token.
- `/sheet`, `/player`, `/public` and `/table` style themselves with Tailwind
  class names only; `css/sheet.css`, `css/player.css`, `css/table.css` and
  `css/host.css` are removed. `/help` and `/demo` are styled by the same
  utilities; their legacy stylesheet rules are gone. A converted element must not
  keep a legacy class for a property the utility sets: unlayered legacy
  declarations outrank the layered utilities. Converted screens keep legacy
  class names as inert hooks and use `!` where an unlayered global
  (`button { font: inherit; color: inherit }`, `a { color: inherit }`) would
  otherwise win.
- Runtime dependencies are `react`, `react-dom`, `@radix-ui/react-dialog` and
  `@radix-ui/react-label`; build dependencies add `tailwindcss`,
  `@tailwindcss/vite`, `@types/react` and `@types/react-dom`.

## Build and publication

- `BASE_PATH` is normalized once in `scripts/base-path.mjs` and feeds Vite, the
  router root, `dist/404.html` and the worker registration.
- `scripts/build-offline.mjs --root dist --out dist/sw.js` hashes the artifact;
  the worker never reads the source tree.
- `scripts/serve-dist.mjs` reproduces GitHub Pages: unknown paths get the real
  404 document, never an SPA fallback.

## Migration map

| Change | Scope |
|---|---|
| `adopt-layered-architecture-foundation` | typed command surface, Vite `dist/`, store factory and ports |
| `type-engine-core` | engine, model, rules, scripts and the effect graph into `core`; remove the two store ports; `js/` keeps the screens behind shims |
| `adopt-react-ui-shell` | React root, Tailwind, shared components, `/sheet` first |
| `migrate-player-screen` | `/player` |
| `migrate-setup-screens` | `/bag`, `/seat`, `/secrets` |
| `migrate-storyteller-console` | `/table`, its dialogs, `css/table.css` and `css/host.css` |
| `retire-legacy-ui` | delete the shims, the facade and the remaining `js/` screens, enable Preflight |

# Design

## Context

See `proposal.md` - Why.

- `ArcaneAppBar` (`src/ui/components/arcane/app-bar.tsx`) renders the seven
  `APP_BAR_NAV` links, Help and `LanguageSwitch`. Below 900 CSS pixels they live
  in one panel behind the toggle; at 900 and above they render inline.
- The sheet language comes from the path: `sheetLang` in `src/ui/shell.tsx`
  reads `/sheet/{ru|en|az}` and falls back to `ports.locale.current()`;
  `SheetScreen` loads that catalog.
- `LanguageSwitch` calls `ports.locale.change(code)`, which is `changeLanguage`
  in `src/entry/main.ts`: load the catalog, apply the locale, then
  `go(current())` - the same path.
- The sheet header renders its own `.sheet-nav` with the table link, the Help
  link and three absolute `/sheet/{code}` links.

## Goals / Non-Goals

**Goals:**

- One navigation surface: the app bar menu.
- A language change from that menu works while the sheet is open and leaves the
  URL declaring the rendered language.
- The scenario and Travellers preferences survive the switch unchanged.

**Non-Goals:**

- No change to the app bar layout, its 900 px breakpoint or its item order.
- No change to how `/help` and `/demo` render their language control.
- No route, storage key or game-state change.

## Decisions

**Delete the header navigation instead of hiding it at a breakpoint.** The app
bar shows the same links inline at 900 px and above and in the panel below it,
so any breakpoint would keep the duplication wherever it is visible. The
`LANGS` list in `sheet.tsx` exists only for that block and goes with it.

**Map a sheet route in `changeLanguage`.** After loading the catalog:

```ts
const route = current();
go(/^\/sheet(\/|$)/.test(route) ? "sheet/" + code : route);
```

- Alternative: make `SheetScreen` follow `ports.locale.current()` and ignore
  the path. Rejected - the spec keeps the URL as the language declaration, and
  a second source of truth would disagree on direct `/sheet/az` links.
- Alternative: rewrite the path inside `LanguageSwitch`. Rejected - the
  `/help` and `/demo` bars inject their own control, so the composition root is
  the one place that serves both.

The remount that `go` causes is lossless: the scenario and Travellers choices
are already written to `pg.sheetScenario` and `pg.sheetTravellers` on every
change.

**Assert the absence in the browser check.** One assertion on the sheet header
(`.sheet-head a` count 0) plus the existing language steps, rewritten to open
the toggle and press `[data-lang]`. The check then waits for both
`document.documentElement.lang` and the `/sheet/{code}` path.

## Risks / Trade-offs

- [The generic computed-style probes `#screen a` and `#screen p` resolve to
  different first matches once the header anchors are gone] -> Re-record
  `scripts/fixtures/computed-styles.json`; the diff must name `/sheet/en` only.
- [`/sheet` without a code falls back to the saved locale, so the regex must
  cover the bare route] -> The `(\/|$)` branch covers it and lands on
  `/sheet/{code}`.
- [A subpath base (`BASE_PATH`) could break the rewritten route] -> `current()`
  strips the base and `go` rebuilds it, so the mapping uses route names, not
  URLs.
- [`.sheet-nav` and `.sheet-langs` might be selected elsewhere] -> Grep shows
  one browser-check step and no documentation; both are removed there.

## Migration Plan

UI-only; no stored data, route or command changes, so no migration and no
rollback beyond reverting the branch.

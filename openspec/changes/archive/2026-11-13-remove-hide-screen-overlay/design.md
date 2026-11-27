# Design

## Context

See `proposal.md` for motivation and `specs/app/ui-shell/spec.md` for the
required behaviour. This document covers the removal.

Current state, verified in the repository:

- `src/ui/screens/table/dialogs.tsx:16-25` maps the `Overlay` draft to seven
  components; `"hide"` renders `HideOverlay` (`:28-47`), a full-screen
  `host-cover` dialog with `t("hide")`, `t("ui.screenHidden")`,
  `t("playerWarning")` and one `[data-act="reveal"]` button.
- `src/ui/screens/table/frame.tsx:332-339` renders the `[data-act="hide"]`
  button in `SidePanel` and calls `drafts.setOverlay("hide")`.
- `src/ui/screens/table/drafts.ts:9-16` lists `"hide"` in `Overlay`;
  `useTableDrafts(guidedPreference, initialOverlay, restored)` seeds the overlay
  from its second parameter (`:103-108`).
- `src/ui/screens/table/index.tsx:40` passes `covered ? "hide" : null` as that
  seed, and `:201-205` returns only `<Overlays>` for the three full-screen
  privacy surfaces, so the host DOM is absent behind the cover.
- `src/ui/shell.tsx:16` defines `PRIVATE = { "/player", "/public" }`; `:40`
  computes `covered` from `snapshot.previousPath`, and `:53` and `:56` pass it
  to the console and to the legacy bridge.
- `src/ui/router.ts:15`, `:26` and `:34` maintain `RouteSnapshot.previousPath`.
  The shell is its only reader.
- `src/ui/legacy-bridge.tsx:13-14`, `:35` and `src/ui/ports.ts:74-77` accept a
  `covered` mount option. `/table` is native and `help.ts:43` and `demo.ts:240`
  declare `mount(root)` only, so the option can never reach a screen.
- `src/ui/i18n/locales/{ru,en,az}.ts` hold `hide` and `ui.screenHidden`;
  `src/ui/i18n/translate.ts` holds "Hide screen" and "Screen hidden" with no
  remaining request site. `playerWarning` is also used by
  `src/ui/screens/player.tsx:140,226,348` and `src/ui/screens/public.tsx:26`.
- `src/ui/screens/table/styles.ts:100` exports `COVER`, used only by
  `HideOverlay`.
- `scripts/browser-check.mjs:1540-1548` clicks the hide control, asserts the
  host is absent on `/player`, then asserts it is still absent on `/table` and
  clicks `[data-act="reveal"]`. `:1066-1067` reveals defensively before a deal
  card step.

## Goals / Non-Goals

**Goals:**

- One less control and one less overlay on the console.
- No dead route, draft, bridge or string code left behind.
- The `/table` browser steps still prove route cleanup and privacy after the
  cover is gone.

**Non-Goals:**

- No replacement cover, no blank screen and no "are you sure" step.
- No change to `/player`: the number picker, the 45-second deadline, the
  hand-back warning and the claim recovery stay.
- No change to the information, grimoire, role card, correction, export and
  import overlays, and no change to the Escape handler that closes them.

## Decisions

### Delete both triggers, not just the card

The owner chose removal over a blank cover. A blank cover would keep the
`covered` route computation, the draft seed and the overlay branch for a screen
that shows nothing, so the whole path goes: the side-panel button, the automatic
cover, the overlay member, the draft parameter and the route snapshot field.

### Remove `"hide"` from the `Overlay` union

The union keeps the six values that still render. `Overlays` loses one branch and
its fallback stays `null`, so an unreachable member cannot silently return
`undefined` from the component. `roleCardBack` keeps the narrowed union; no
caller could set it to `"hide"` unless the overlay was open, which the removal
makes impossible.

### Drop `previousPath` from the route snapshot

`RouteSnapshot.previousPath` existed to answer "did the host come from a private
route". With the cover gone nothing reads it, so the router builds
`{ path, version }`. Alternative considered: keep the field for a future privacy
feature — rejected as a speculative field that the router would still maintain
and nothing would read.

### Drop the `covered` mount option from the legacy bridge

`LegacyScreen.mount(root, options?)` and the `LegacyBridge` prop can only ever be
true for `/table`, which is a native screen, and both legacy screens declare
`mount(root)`. The option, the prop and the call-site argument go; `LegacyBridge`
keeps its `screen` prop and its mount, locale watch and cleanup effect.

### Keep `playerWarning`

The sentence stays in three catalogs because the hand-off still needs it: the
`/player` back-to-table confirmation, its two inline notes, and the `/public`
confirm. Only the console cover used it out of context.

### Tests

Red before green: add the `/table` assertions to `scripts/browser-check.mjs`
first and record the failure, which must show the hide control present and the
console absent behind the cover. The stale-Escape regression keeps its subject —
a disposed table listener must never act on another route — by pressing Escape on
`/player` and asserting the route, the player view and the absent console; the
covered-start and reveal steps go because their subject is gone.

## Risks / Trade-offs

- **`scripts/browser-check.mjs:1066-1067` and `:1547-1548` reveal defensively**
  → delete those clicks with the cover; the deal card and correction steps reach
  `.host` directly afterwards.
- **`.host` assertions around `:1543`** → after the change `.host` renders on
  `/table` and stays absent on `/player`; the rewritten step asserts that pair,
  so the route isolation keeps its coverage.
- **Baseline spec drift** → `openspec/specs/app/ui-shell/spec.md` still pins the
  overlay until the change archives. The sync removes the requirement and
  restates the setup-route requirement, so the two never disagree on `main`.
- **Documentation drift** → `README.md:103`, `SPEC.md:270`,
  `docs/architecture.md:84` and `docs/improvement-implementation.md:12,36`
  describe a covered return; they change in the same pull request.
- **Removing `previousPath` touches the router** → no test names the field; the
  typecheck proves every reader is gone and the browser steps prove navigation.

## Migration Plan

Internal UI removal with no data, route or storage migration. No flag; revert the
squashed commit to restore the cover. `openspec/changes/mobile-burger-menu` does
not reference the cover, so the two changes can merge in either order.

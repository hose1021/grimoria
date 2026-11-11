# Design

## Context

See `proposal.md` for motivation. The measured starting state:

- The four host screens build their own header. `bag.tsx` renders
  `.setup-head` with Script, Saved, Table, Seats and Help plus the language
  switch; `seat.tsx` renders `.seat-top` with Player, Secrets, Undo, Shuffle and
  Use this order; `secrets.tsx` renders `.secrets-head` with Seats and Table;
  `table/frame.tsx` renders seven route links and four local controls. The
  legacy `css/setup.css` and `css/seat.css` rules wrap the nav
  (`display: flex; flex-wrap: wrap`).
- The bag support summary (`bag.tsx:1445`) renders a bold level followed by
  three inline spans with no separator. The secrets summary
  (`secrets.tsx:67`) already separates its items.
- `t()` falls back to the key (`src/ui/i18n/strings.ts`). No catalog defines
  `preview`, so three bag buttons render the key. Key parity tests pass because
  the key is missing everywhere.
- The catalogs hold 17, 6 and 7 em dashes in `ru.ts`, `en.ts` and `az.ts`.
- Bag token labels are styled by `.bag-token b { font-size: 9.5px }` in
  `css/bag.css`. Chips measure 64 px wide; the longest label box measures 73 px.
- `scripts/browser-check.mjs` already has a phone walk and an `auditPhone`
  helper, so the layout assertions join an existing harness.

## Goals / Non-Goals

**Goals:**

- Close all nine audit findings without changing game behavior.
- Make the audit properties machine-checkable: copy, navigation, spacing,
  duplicate controls and tap targets.
- Keep one source for the host destination list so the screens cannot drift
  again.

**Non-Goals:**

- A visual restyle or a new palette. The audit found the identity specific.
- Fixing curly apostrophes in the English catalog or hardcoded English
  announcements in `seat.tsx`; neither is an audit finding.
- Migrating `/help` or `/demo` to React.
- Changing routes, commands, storage keys or projections.

## Decisions

### One host navigation component

Add `src/ui/screens/host-nav.tsx` exporting `HOST_ROUTES` and `HostNav`. The
list is all eight destinations: table, bag, seat, secrets, player, public, help
and sheet. The component renders links from `useShellPorts().router.path()`,
sets `aria-current="page"` on the active route, and carries `data-host-nav`.

- At 1440 px it renders as the current wrapped row.
- At 390 px the bar becomes one menu button: a native `<details>` summary
  occupying one row, 44 px high. Opening it lists all eight destinations as
  44 px links inside the viewport. Closing on Escape and on navigation keeps
  the menu from trapping the host. The document must still not scroll
  horizontally.
- Screen-specific controls leave the destination list. The bag keeps Script and
  Saved in a local action row; the seat keeps Undo, Shuffle and Use this order;
  the console keeps Undo, Export, Import and Hide in a separate
  `data-host-actions` group.

Alternatives: a horizontal scroll row keeps every destination one tap away,
but it puts trailing links outside the viewport, which the existing phone
acceptance forbids. A menu costs one extra tap and keeps every visible control
inside the viewport; the audit allowed either.

Remove the legacy `.setup-nav`, `.secrets-nav` and `.seat-actions` rules that
lose their last consumer; keep the header containers.

### Support summary as separated items

The bag summary renders `<b>{level}</b>` and one span that joins the three
counts with ` · `, inside `flex flex-wrap items-center gap-x-2 gap-y-1`. The
secrets summary already uses the same visible form. No shared component: two
call sites, three lines each.

### Copy edits per string, not a global replacement

Rewrite each dashed sentence with a period, comma or colon, preserving its
placeholders and its meaning in each language. Add `preview` to all three
catalogs ("Просмотр", "Preview", "Önizləmə"). The isolated `—` the screens emit
as an empty value stays; it is not catalog copy.

Add `src/ui/i18n/copy.test.ts`:

- Walks every value in `ru.ts`, `en.ts` and `az.ts`; fails on U+2014. The test
  names the key and the language.
- Extracts literal keys from `t("...")`, `strings.t("...")` and
  `ports.strings.t("...")` under `src/ui` and `src/entry`; fails when a catalog
  lacks the key. Dynamic keys composed at runtime stay covered by
  `src/ui/i18n/strings.test.ts`.

### Role token label size

Use the existing `.bag-token b` owner and raise it to 11 px; give the chip a
width of 96 px and let the label occupy two lines. The token row keeps three
chips per row at 390 px. If a name is longer than the 86 px content box, it
wraps; the audit's priority is the full role name, not the column count.

### Vertical composition

`/seat`: add `justify-center` to `.seat-stage` and let the mobile minimum height
subtract the real header height. `/player`: center the handoff card in
`min-h-[calc(100dvh-...)]` and keep the bottom safe-area padding. The browser
check measures the gap above and below the ring and the card and allows a 40 px
difference.

### Design note

Add `docs/design-direction.md` with the theme reason (night game, secret
information, one host), the dials ENERGY 1 / RHYTHM 2 / MOTION 1, the green
accent meaning (advance the session), and the two motifs (role tokens, seat
ring). No spec requirement: the note records a decision, it does not change
observable behavior.

## Risks / Trade-offs

- A scrollable nav hides trailing destinations at 390 px. Mitigation: the first
  destinations are the setup flow, and the current route is marked.
- Moving Script and Saved out of the bag nav removes a one-tap script switch.
  Mitigation: they stay in the header as a visible local action row.
- Four chips per row may drop to three at 390 px after the 11 px label. The
  browser check asserts the label is readable, not the column count.
- Rewriting 30 dashed strings can change tone. Each string is reviewed in its
  language; placeholders are asserted by the parity test.
- The browser check grows; it runs on pull requests and on demand already, so no
  new CI job is added.

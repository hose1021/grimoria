# Design

## Context

See `proposal.md` for the motivation. `/table` branches on the phase in
`MainCard` (`src/ui/screens/table/cards.tsx:73`): day and night render
`TableRing`, `over` renders `OverCard`, and every phase before the first night
renders a single card inside `mx-auto mt-2 grid w-full max-w-[900px]`
(`src/ui/screens/table/index.tsx:298`). That is the blank stage in the owner's
screenshot: the card sits at the top of a scrollable full-height stage.

The pre-night branch is two components. `SetupPrompt` renders when `phase` is
`setup` and `setup.roles` is empty: label, `noRoles`, `setupIntro`, then
`ui.begin` → `/bag` and demo. Otherwise `DealCard` renders, which derives one of
three steps from saved state: `everyoneNamed = claimed === players.length`,
`seated = phase === "seat"`, `step = names | seats | secrets`. It shows the
manual and BMR warnings, a 7 px progress bar, four near-equal buttons (the
current route uses `btn--accent`, the rest `btn`), the secrets error list, and
the `start-night` button while `seated`.

Facts the new surface must respect:

- `state.order` is the seat contract; `orderedPlayers()` returns seats in order
  and each player carries `seat`, `name`, `claimed`.
- The dock (`src/ui/screens/table/dock.tsx`) already publishes the phase chip,
  the day and night numbers, living and dead counts, undo, roster and menu, and
  shows `t("setup")` as its step line during setup. It renders no action row
  before the first night, so the setup phase's single primary belongs to the
  stage.
- The dock owns the table action classes (primary, secondary, danger, quiet,
  outline and icon) in `dock.tsx`; this change moves them to `styles.ts` so the
  dock and the board share one primary. `--color-table-primary` and
  `--color-table-primary-ink` exist; the board adds no token.
- `t(key, vars)` interpolates `{name}`; `strings.test.ts` requires every key
  and every parameter set in `en`, `ru` and `az`.
- `scripts/browser-check.ts` seeds state with `seed(count, phase)`, which marks
  every player unclaimed when `phase === "deal"`, and it already asserts the
  table window, overflow and 44 px targets for day and night.
- `openspec/changes/table-surface-redesign` covers the felt, seats and dock for
  day and night and does not touch this card; this change stays separate.

## Goals / Non-Goals

**Goals:**

- One component for every phase before the first night.
- The saved roster visible with claim state, in seat order, at a glance.
- One primary action per step, in the dock's action language.
- The stage used on a desktop instead of a strip under the bar.

**Non-Goals:**

- The ring, the felt, the hub, the dock's content, overlays and any route other
  than `/table`'s pre-night stage.
- New state, commands, projections, tokens, dependencies or stylesheets.
- Fixing the existing edge where `phase` is `setup` with roles chosen but not
  dealt. The board keeps today's behaviour for it.

## Decisions

**`SetupBoard` replaces `SetupPrompt` and `DealCard`.** One component derives the
step and renders the header, the step rail, the roster and the actions.
Alternative: restyle `DealCard` and leave `SetupPrompt` beside it; rejected
because the two states are the same moment and two layouts would drift. The
board's markup starts with `data-setup-board`; `MainCard` returns it for
`setup`, `deal` and `seat`.

**The board owns the stage height and centres only when it fits.** The board
wrapper becomes `mx-auto flex min-h-full w-full max-w-[1100px] flex-col gap-3
py-3 min-[620px]:justify-center`. `min-h-full` resolves against the stage,
which is a definite-height flex child, so the board centres on a desktop and
scrolls from its top on short viewports. `justify-center` applies from 620 px
only, because a centred flex column clips its first line when the content
overflows a scroll container. Alternative: a fixed-height grid; rejected — it
would clip at 360x640.

**The step rail is derived, not clickable.** Four items — roles, names, seats,
secrets — marked `current`, `done` or `pending`. Current uses
`border-table-primary` plus `text-table-primary` and `aria-current="step"`;
done uses a `✓` glyph (`aria-hidden`) plus a visible label, so the state never
depends on colour. Items are list entries, not links: jumping would bypass the
claim and seat checks that `/player` and `/seat` own. Alternative: rail links;
rejected for that reason.

**The roster is the progress.** One chip per `orderedPlayers()` entry, in
`state.order`, showing the seat number, the name or the unclaimed label, and a
claim mark. Claimed: `✓` glyph and `text-table-primary`; unclaimed: `·` glyph
and `text-muted`; both keep an `.sr-only` text label. The 7 px bar is replaced
by `t("ui.namesCount", { claimed, total })` with `tabular-nums`. Alternative:
keep the bar over the chips; rejected — the chips already say which seats are
missing and the bar repeated one number less usefully.

**Exactly one primary, styled like the dock.** The board reuses the dock's
action classes, moved from `dock.tsx` to `styles.ts` as `ACTION_PRIMARY`,
`ACTION_SECONDARY`, `ACTION_DANGER`, `ACTION_QUIET`, `ACTION_OUTLINE`,
`ACTION_DISABLED` and `ICON_BUTTON`, and imported by both files. The old
`PRIMARY` constant is deleted with its last caller. Per step:

- roles → link to `/bag`, label `ui.begin`, no route links (as today's prompt).
- names → link to `/player`, label `ui.handoff`.
- seats → link to `/seat`, label `ui.seats`.
- secrets → `startNight` button labelled `startFirstNight`, `disabled` while the
  secrets projection reports an error, with the error list directly above it;
  `/secrets` becomes a quiet link beside it, not a second primary.

The other permitted routes and the demo are `ACTION_QUIET` links, each at least
44 px tall. `data-act="start-night"` and `data-act="demo-15"` stay, so the
existing flows and checks keep working. Alternative: keep the four `.btn`
buttons; rejected — that is the hierarchy failure in the screenshot.

**Copy reuses existing keys; five keys are added.** `ui.names`,
`ui.arrange`, `ui.checkSecrets`, `noRoles`, `setupIntro`, `playerHandoff`,
`discussWarning`, `setupErrors`, `startFirstNight`, `ui.begin`, `ui.handoff`,
`ui.seats`, `ui.secrets`, `seats`, `secrets` and `demo` already exist. Added:
`ui.setupRoles`, `ui.setupNames`, `ui.unclaimed`, `ui.claimed` and
`ui.namesCount` in all three catalogs. The rail uses `seats` and `secrets` for
its last two labels, so no synonym is introduced.

**Order inside the board.** Label (`setup`), title per step, step rail, manual
and BMR warnings, roster with the name count, secrets errors, actions, then the
caution line. The caution sits last because it is a reminder for the players,
not a prerequisite. The manual and BMR warnings stay where they are today, above
the content they qualify.

**Verification is one browser case, not new unit tests.** The change adds no
pure function that is not already covered: the step derivation stays inline and
is observable in the DOM. `scripts/browser-check.ts` gains a setup-board case
that seeds `deal` with eight players, claims three, and asserts: the board and
eight chips render in seat order; three chips are claimed and five read as
unclaimed; the name count reads three of eight; exactly one rail item is
`aria-current`; the primary is `/player`; after claiming all eight the primary
is `/seat`; at `seat` the primary is the first-night button; the board contains
no role text; there is no horizontal overflow at 360 and 390 px. The hooks the
case reads are `data-setup-board`, `data-board-step` with
`data-state="current|done|pending"`, `data-board-seat`, `data-board-claim`,
`data-board-count` and `data-board-primary`.

## Risks / Trade-offs

- **A tall board clips its first line when centred** → centre from 620 px only;
  `min-h-full` plus top-aligned flow below that; the 360x640 case asserts the
  stage scrolls.
- **Fifteen chips at 390 px become a long list** → two columns below 620 px, four
  from 620 px, five from 1100 px; the stage is the only scroll container and the
  dock stays fixed.
- **The primary is mistaken for the dock's missing action** → the dock renders
  no action row before the first night, and the board is the only primary on the
  screen.
- **The board leaks a secret during the handoff** → it reads `order`, `seat`,
  `name` and `claimed` only; the browser case asserts no role text, and the
  player and public projections are untouched.
- **A new locale key lands in one catalog only** → add all three; `strings.test.ts`
  fails on a missing key or a parameter mismatch.
- **`docs/design-direction.md` differs from the dirty checkout this change was
  planned in** → implementation runs in a worktree from `origin/main`; append the
  board paragraph there and never copy the checkout's unrelated edits.
- **The table action classes move out of the dock** → the class strings are
  identical after the move; the dock's own browser assertions cover its action
  shapes, so a mistake surfaces in the same run.

## Open Questions

None.

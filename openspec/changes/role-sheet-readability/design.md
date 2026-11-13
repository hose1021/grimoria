# Design

## Context

See `proposal.md` "Why". The sheet renders each role with `RoleCard` in
`mode="compact"` and `orientation="row"`: a 62 px artwork column, a team label,
the name, and the ability clamped to three lines at 9.5 px. The sheet grid is
`repeat(auto-fill,minmax(250px,1fr))` above 680 px and one column below it.

Measured catalog lengths for the 77 sheet roles: Russian reaches 186 characters
(Pit-Hag), English 137 (Beggar), Azerbaijani 148 (Evil Twin). At 250 px a card
leaves about 158 px for text, so the ability needs roughly six lines, not three.

Constraints from existing specs:

- Styling lives in Tailwind utilities; the one theme block supplies the values.
  `app/design-tokens` requires reading theme values rather than inventing new
  ones, so the sizes come from the Tailwind default theme (`text-base` 16 px,
  `text-xs` 12 px) that the global stylesheet imports.
- `scripts/style-parity.mjs` records `document.querySelector` probes, none of
  which target a role card, so a layout change inside the sheet is expected to
  leave `scripts/fixtures/computed-styles.json` untouched.
- The sheet stays read-only; the change touches no command, store or catalog.

## Goals / Non-Goals

**Goals:**

- Every role card shows the complete name and ability with no clipping at
  every width the app supports.
- The name and ability stay readable: 16 px and 12 px.
- One automated check proves the condition for all 77 roles at six widths.

**Non-Goals:**

- No change to role cards outside the sheet, to other screens' truncation, or
  to the sheet's filters, language switch and persistence.
- No new colour, spacing or typography token, and no typography refactor.
- No change to the browser-check harness or to the style-parity baseline.

## Decisions

**Remove the clamp and let the card grow.** A clamp cannot be correct for
abilities of different lengths. The alternative, a line budget per language,
would still truncate and would need maintenance per catalog.

**Read the sizes from the theme: `text-base` for the name, `text-xs` for the
ability.** The card currently uses arbitrary `text-[15px]` and `text-[9.5px]`.
The theme already provides both needed sizes through the imported Tailwind
theme, so no value is invented. The alternative, another arbitrary value, would
contradict `app/design-tokens`.

**Raise the grid minimum to 320 px and keep one column below 680 px.** At
250 px the removed clamp produces a six-line, 158 px-wide text column. A 320 px
minimum yields about 270 px of text on desktop (three columns in the 1180 px
page) and keeps the current single column on phones. The alternative, a stacked
card with artwork above text, makes every card taller and the page longer
without improving the measure.

**Assert with DOM measurements in the existing Playwright check.** For every
card compare the rendered ability text with the loaded catalog, read computed
`-webkit-line-clamp`, compare `scrollHeight` with `clientHeight` for the card
and its text, and read the computed font sizes. A screenshot comparison has no
baseline for this state and fails on font rendering, not on truncation.

## Risks / Trade-offs

- [A grid row stretches to its tallest card, leaving space under short cards] →
  Accept it: the grid already sizes rows to content, and the extra space is
  preferable to truncation.
- [The page gets taller, especially with the Travellers toggle on] → Accept it;
  the sheet is a reading surface, not a viewport-fitting screen.
- [Long Russian names such as "Злой Близнец" wrap to two lines at 16 px] →
  Accept it; the card grows and the name stays complete.
- [A future card style reintroduces a clamp and the check only covers the
  sheet] → The check names `-webkit-line-clamp` explicitly, so it fails on the
  exact regression.

## Migration Plan

Single release, no data or route migration and no rollback step: the change is
presentation only and the saved game key is untouched.

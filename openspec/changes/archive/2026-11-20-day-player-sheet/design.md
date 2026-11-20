# Design

## Context

The day console renders the seat ring and the fixed dock. The only code that
set the execution target was the seat click, while the execution select in the
day card is hidden in the day-help sheet's role-form mode. The host therefore
had no sheet for a player and no explicit target choice.

## Goals / Non-Goals

**Goals:**

- One seat interaction that opens the player sheet.
- Keep the dock as the only execution control.
- Keep corpse execution available, as the engine allows it.

**Non-Goals:**

- A new route or a new overlay type: the existing player sheet and its
  `playerSheet` overlay carry the content.
- Changing the execution command or the threshold rules.
- Changing the night target selection.

## Decisions

- **The seat click opens the sheet.** `selectSeat` keeps its night branch and
  its no-step branch; only the day branch changes. The sheet shows the role,
  the correction and card controls and a select/clear button for the target.
- **The target stays a draft.** `drafts.executeTarget` already feeds the dock
  preview and the ring highlight, so the sheet writes the same draft and the
  dock executes it. The day-help sheet continues to show no execution control.
- **No alive-only guard.** The dock already allows a corpse execution; the
  sheet's select button follows the dock so both surfaces agree.

## Risks / Trade-offs

- The host needs two taps (sheet, then dock) to execute. The alternative, an
  execute button in the sheet, would duplicate the dock control and violate the
  day-help sheet rule.
- A host who expects the old one-tap selection loses it. The sheet is explicit
  and the day-help test stays readable.

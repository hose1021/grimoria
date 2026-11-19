# Design

## Readiness

`stepContext` already computes `blockers` from the same gate the step sheet uses.
The dock will read that list instead of re-deriving readiness: the action is
disabled while `blockers.length > 0`, and the blocker sentence already rendered
above the button becomes the button's `title` and `aria-label`. The sheet can
therefore only open in a state where its confirm control is enabled.

## Dock budget

- The effect block renders only when the step has effects.
- The consequence preview renders only when it has a line, a rejection or a
  prevented-death warning.
- When both are empty the dock renders one muted sentence, so the zero state
  costs one line instead of two labelled blocks.
- The day instruction moves from the dock hint to the table menu's day panel;
  the dock hint names the selected execution target instead.
- On the day phase the dock renders one preview: the execution preview when a
  target is selected, otherwise the end-day preview. The two calls to
  `ConsequenceList` collapse into one.

## Stage space

The stage is a scroll container and the dock is its sibling. Seat labels are
absolutely positioned outside the ring box, so a bottom label can sit at the
stage edge. The stage gains bottom padding equal to the label allowance the ring
already reserves (`INSET_Y`) and the seat number moves into the medallion at all
widths. The ring keeps its measured layout; no new layout engine.

## Execution confirmation

A new `execute` overlay renders the execution target, seat, role and the engine
preview in the future tense, with `[data-act="execute-confirm"]` and a cancel
control. The dock control opens the overlay; only the overlay dispatches
`executeByDecision` with the same `previewIdentity`. Cancelling keeps the
selected target. The undated past-tense copy in the preview stays for the
recorded outcome in the hub.

## Wake order

`QueuePanel` already renders progress, the next three wakes and the full order
from `tableProjection`. It is mounted in the table menu under the journal, and
its hardcoded Russian strings move to locale keys. The dock adds a `next wake`
fragment to the step line.

## Typography floor

Functional text rises to 12 px: phase chip, seat number, roster rows, journal
title, filters, entry title, details and time, and the setup step list. Badge
micro-labels stay at 10-11 px uppercase because they are secondary; the seat
medallion number and every value the host compares under pressure reach 12 px.

## Night-step interface split with #318

Issue #318 changes the same night-step surfaces: `skipStep` in the engine and
the generic Skip control in the dock and the step sheet. This change keeps that
behavior untouched: it only changes when the primary action opens the sheet,
and it leaves `skipStep`, the `[data-act="skip"]` control and the sheet's
`[data-act="step-skip"]` control as they are. #318 therefore branches after this
change and replaces the skip semantics inside the same interfaces, without
reverting the readiness gate or the execution overlay.

## Risks

- Disabling the dock action reduces the affordance to open the sheet for
  reference. The sheet stays reachable once the step is ready, and the blocker
  line explains the state.
- Removing the vote save control changes a two-step entry into one; the field
  commits on blur and Enter, and an unchanged value never dispatches.
- A new overlay must not steal focus from the ring permanently: closing returns
  focus to the dock control through the existing `captureFocus` path.

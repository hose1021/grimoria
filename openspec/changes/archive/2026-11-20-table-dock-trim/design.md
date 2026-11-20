# Design

## Context

The fixed dock sits below the seat ring. It carries the phase, the current
step, the preview, the consequence list and the day actions. The hub in the
middle of the ring already shows the vote threshold next to the nomination.
The day-help sheet renders the role forms the current state allows.

## Goals / Non-Goals

**Goals:**

- Remove content the host cannot act on from the dock.
- Make the day-help action say whether the sheet has anything inside.
- Keep one source of truth for the day-help forms.

**Non-Goals:**

- Changing the threshold rule, the execution command or the day-help contents.
- Adding a new overlay, route or state field.
- Replacing the `.btn` primitive or its tokens.

## Decisions

- **One form list.** `dayHelpForms(state)` in `helpers.ts` returns the role
  forms the sheet can show. The sheet gates on that list and the dock counts
  it, so the label cannot promise a form the sheet hides. The pure function is
  unit-tested.
- **The hub owns the threshold.** The dock line repeated the hub value. The
  hub keeps the readout and the browser check asserts it there. The dock keeps
  the phase, the step and the preview.
- **The timer hides when empty.** `timerText` keeps its documented `—` return
  for the table menu, where the timer value has a label. The dock renders the
  readout only while `timerEnd` is set.
- **Outline from the existing primitive.** `.btn` already carries the border;
  `bg-none` drops its gradient. Hover keeps the shared `.btn:hover` fill, so
  the outline button needs no new CSS rule.

## Risks / Trade-offs

- The host loses the dock threshold at a glance and must read the hub. The hub
  sits on the same screen and already carries the nomination and the tally.
- A disabled execute control no longer explains itself. The consequence list
  still shows a rejection reason, and the hub shows what the table is doing.

# Design

## Problem

The day-help form list was computed inside `open = !day.execution && !day.ended`.
Most forms depend on an open day: the Virgin nomination, the Slayer shot, the
Artist's question. The Klutz's choice does not: the trigger is the death, and a
day execution sets `ended` before the player learns of the death.

## Change

The Klutz form moves outside the `open` block: it is offered while the game is
in the day phase and a dead Klutz with the ability has not chosen. The panel is
rendered by the same `DayCard` the day-help sheet already mounts, so the dock
count and the sheet cannot disagree.

The panel dispatches the existing `recordKlutzChoice` command with one living
player; the engine owns the target legality, the impairment fact stored in the
death record and the win.

## Why this point

One predicate and one panel, and the existing command stays the single mutation
path. The alternative — a second manual-winner path or a direct state edit —
would bypass the journal and the win check.

## Reload

The choice is engine state (`used.klutz`, `used.klutzTarget`), so a reload shows
no panel after a recorded choice and the journal keeps the reason.

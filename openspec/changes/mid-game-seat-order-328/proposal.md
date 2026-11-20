# Proposal

Issue: #328

## Why

F-017, UI-021. `/seat` is reachable from the app bar in every phase, and
`setOrder` runs in `any`. Reordering mid-game changes the neighbours and
distances that the Empath, Chef, Tea Lady, No Dashii and Clockmaker read, without
a warning.

The pinned sources fix the circle. [Setup r1361](https://wiki.bloodontheclocktower.com/index.php?title=Setup&oldid=1361)
requires "a definite clockwise or counterclockwise order" and places the
Grimoire tokens to match the seating positions; [Glossary r3168](https://wiki.bloodontheclocktower.com/index.php?title=Glossary&oldid=3168)
defines "Neighbors" and "Alive neighbours" by the sitting order. The app contract
`game/lifecycle` "Seat order correction during play" was the only place that
allowed the escape hatch.

The owner chose the release behavior: forbid ordinary reordering after the game
starts. That keeps the player circle intact and closes F-017.

## What Changes

- `setOrder` runs in `setup`, `deal` or `seat`; `night`, `day` and `over` reject
  it with `error.47` (a finished game still reports `error.6`).
- A new ruleset version, `tb-bmr-snv-2026-11-20`, holds new commands to the
  rule. A journal recorded before it keeps the mid-game reorder it was accepted
  with, so replay and undo reach the same seat order.
- `/seat` renders a locked state with a link to the table outside those phases.
- The lifecycle and seat-screen specs state the restriction.
- Engine, findings and browser tests cover the refusal and the UI gate.

## Out of Scope

- An explicit correction mode with a warning, a confirmation and a journal
  entry.
- Recomputing or invalidating information already given after a wrong seating.

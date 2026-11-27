# Proposal

Issue: #319

## Why

`recordKlutzChoice` is the only legal command with no caller in `src/ui`: the
verification gate records it as a missing action. A Klutz executed during the
day dies through the execution path, which ends the day; the console then shows
no day-help form, because every role form was gated on the day still being open.
The Storyteller cannot record the mandatory public choice except through the
manual winner, which writes no `used.klutz` and no reason.

Klutz r1758: "When you learn that you died, publicly choose 1 alive player: if
they are evil, your team loses." The choice follows the death, so it must
outlive the day that ended.

## What changes

- `dayHelpForms` offers the `klutz` form whenever a dead Klutz still owes the
  choice, independent of the day being open or ended.
- The day-help sheet renders a Klutz panel with one living player and the
  existing Record choice action, which dispatches `recordKlutzChoice`.
- The choice, its failure and its win are journaled by the engine as before.

## What stays

- The engine rule: one living target, an evil target loses immediately for the
  Klutz's team, an impaired Klutz spends the choice without a winner, and a
  second choice is impossible.
- The night path: a Klutz who dies at night keeps the appended step and its
  existing completion.
- No schema, storage key or command payload changes.

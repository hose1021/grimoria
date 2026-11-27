# Proposal

Issue: #104
Follow-up from #98 and #103.

## Why

The engine rejects a dead Snake Charmer target with `error.55`, and
`js/snv.test.mjs` asserts that rejection, but the Storyteller target picker in
`src/ui/screens/table/cards.tsx` still offers dead seats for the `snakecharmer`
step. The host can select a seat the engine will refuse, so the step blocks on a
command that can never be applied. The archived change
`2026-11-11-sv-character-replacements` deferred this task (2.10) to this issue.

## What Changes

- The target picker's `disabled` expression gains the Snake Charmer rule: on a
  `snakecharmer` step, every dead player's seat is disabled while living seats
  stay selectable. The engine keeps rejecting a dead target with `error.55`.
- `scripts/browser-check.mjs` gains a regression that seeds a Sects & Violets
  game, reaches the Snake Charmer step with one dead and one living player, and
  asserts the disabled/enabled state of both seats.

Out of scope: engine rules, other role steps, and the target picker rules for
the Pit-Hag, Witch or Cerenovus.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `app/ui-and-privacy`: adds the Snake Charmer dead-seat rule to the
  Storyteller step card.

## Impact

- Code: `src/ui/screens/table/cards.tsx`.
- Tests: `scripts/browser-check.mjs`.

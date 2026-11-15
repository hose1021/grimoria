# Proposal

Issue: #218

## Why

Grandmother r2978: "You start knowing a good player & their character. If the
Demon kills them, you die too." How to Run: "choose a Grandchild by marking any
**good** character"; and when the Demon kills the grandchild, "the Grandmother
dies - mark them with the **DEAD** reminder."

Two defects:

- The first-night step stored any chosen seat as the grandchild. An evil target
  was accepted and its character shown.
- When the Demon killed the grandchild, the engine appended a death step but
  never killed the Grandmother. `recordBmrOutcome` cannot record her death
  because the step targets nobody.

## What Changes

- The first-night step rejects a grandchild whose real team is not Townsfolk or
  Outsider with `error.grandchild`; the stored id changes only after the check.
- `appendBmrConditionalSteps` kills the Grandmother through the shared death
  path when the Demon killed the grandchild. Protection still applies, and a
  drunk or poisoned Grandmother has no ability.
- The death step declares `canKill: false`; it is a notification, not a host
  death control.
- Three locale catalogs gain `error.69`.

## Out of Scope

- The `bmrTargetError` helper, which no production path calls.
- Registration of a Spy or Recluse as a good character for the grandchild. The
  pin says a good character; the actual team decides.
- Traveller targets, which cannot enter the game.

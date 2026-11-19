# Proposal

Issue: #313

## Why

Zombuul r3022, Summary: the first death leaves the player alive but registered
dead, and "They cannot nominate". The engine now rejects such a nomination, but
the table's Virgin nomination picker still lists the player, because it builds
its options from `livingPlayers`. The host can select a player the command then
refuses.

## What Changes

- `nominatorChoices(state)` in the table read model returns living players who
  register as alive.
- The Virgin nomination picker renders that list.
- One behavioural read-model test.

## Out of Scope

- The engine guard (PR #334) and the execution-threshold question, which needs
  an owner decision.
- Traveller nominations, which are outside the supported set.

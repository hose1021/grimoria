# Design

## Decision

The picker asks the application read model, not the model module, for its
options. `nominatorChoices(state)` filters `livingPlayers(state)` through the
existing `registersAlive` predicate, which already feeds the Tea Lady, the
Chambermaid, the public count and the engine's nomination guard after #334.

The screen keeps rendering one list; it does not re-derive the rule.

## Risk

The only consumer is the Virgin nomination form. A registered-dead player stays
selectable as a nominee, which is correct: dead players can be nominated. The
engine still rejects a forged command from a stale page, so the change is a UX
correction, not a security boundary.

## Verification

The read-model test builds a five-player Bad Moon Rising day, marks the Zombuul
registered dead, and asserts the option ids are the other four players. It fails
against `livingPlayers` and passes with `registersAlive`.

# Design

## Problem

The dialog builds the change object from a single string draft. Two engine
kinds need different shapes: `shown` takes a role id or null, and `effect`
takes an effect id plus `value: false`. Neither control existed, so the two
commands were unreachable from the console.

## Change

- `defaultCorrectionValue("shown", player)` seeds the player's shown role, so
  the host changes only what is wrong.
- The kind select adds "shown role" and "deactivate effect".
- The shown control lists the script roles plus an empty choice (null).
- The effect control lists the selected player's active effects by id, with
  source and target names, so an effect is picked, not typed.
- `apply` builds `{ kind: "shown", value }` or `{ kind: "effect", effectId,
  value: false }` and keeps the required reason.

## Why this point

The dialog is the one correction surface; adding the controls there keeps the
journal, the undo history and the engine validation unchanged. A separate Witch
panel would duplicate the effect list and the reason requirement.

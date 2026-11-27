# A living actor's mandatory night step cannot be skipped

Issue: #318

## Why

`skipStep` marks any step `done` and `skipped` and never reads the step's
`optional` flag. On Trouble Brewing, the fifth night's Imp step can therefore
return `ok: true` with no deaths: the Demon's mandatory attack disappears from
the state, the journal keeps a generic skip line, and the queue moves on. The
console offers the same "Skip wake" control on every step.

The Po has the same defect from the other side. Its step is mandatory and its
"no one" answer is a decision that writes `used.poNoOne` through the standard
completion. A host who uses Skip instead records nothing, so the next night
offers one target rather than the three the Po charged.

## What changes

- A new `canSkipStep` predicate names the steps the engine allows the host to
  leave unrecorded: optional steps, steps without an actor, a dead actor's
  step, and the death-triggered wakes. A living actor's mandatory step is not
  one of them.
- `skipStep` rejects a forbidden skip with `error.80` before any mutation:
  state, journal and queue stay as they were.
- The dock and the step sheet render Skip only where `canSkipStep` allows it.
- The Po gets an explicit No one action on its step, which completes the step
  with zero targets and records `used.poNoOne`; the next night then takes
  three targets. Skip is no longer offered on the Po step.

## What stays

- **The rules.** The Imp must choose a player each night except the first
  (r3116); the Po may choose no player, and that choice charges the next
  night (r3104).
- **Allowed skips.** Optional abilities, system steps, dead actors and the
  death-triggered wakes keep the current behavior and the same note and log
  line.
- **The command contract.** `skipStep` keeps its payload and its `allowed`
  and `rejected` results; only the rejected set grows.

## Impact

The rule is versioned: `tb-bmr-snv-2026-11-19` is the first ruleset version
that refuses the skip. A journal recorded under an earlier version keeps its
skip and still replays, so saved games and their undo history are unchanged.
No schema, storage key, command payload or role row changes. A living
mandatory step needs its own completion, which the engine already offers.

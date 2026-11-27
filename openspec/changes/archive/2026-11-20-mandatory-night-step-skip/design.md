# Design

## The predicate

`canSkipStep(state, step)` answers one question: may the host leave this step
unrecorded? It returns true for:

- a step already marked done or skipped: false, as before;
- an optional step (`step.optional`): the role's own text makes the action a
  choice, and doing nothing is a legal answer (Assassin, Barber, Courtier,
  Philosopher, Professor, Seamstress);
- a step without an actor: the system wakes (`minioninfo`, `demoninfo`,
  `demonchange`) are information the host may pass over;
- a death-triggered wake whose actor has died: the queue builder or the
  conditional appender added it, and the host may decline the wake;
- a step whose actor is not alive, or no longer in the roster: the actor
  cannot act.

Everything else is a living actor's mandatory step. `skipStep` rejects it
with `error.80` before it reads the reason or writes anything, so the step,
the queue, the log and the seat records stay untouched. `applyCommand`
already rolls back a rejected command, so the command surface and the domain
function agree.

The flag is the one the step already carries: `makeBmrStep` and `makeSvStep`
copy `optional` from the role's `NightStepSpec`, and the Trouble Brewing
builder leaves it unset, which reads as mandatory. The Po declares no
`optional` (its no-one is a decision that charges the next night), so it is
mandatory too.

## The Po

"Each night*, you may choose a player: they die. If your last choice was
no-one, choose 3 players tonight" (Po r3104). The step already resolves zero
targets into the role module's `record-no-one` intent, which writes
`used.poNoOne`. The console now names that choice: the dock and the step sheet
show a No one action on a Po step whose minimum is zero, and the sheet explains
that the next night takes three targets. The action completes the same step
with an empty target list, so the engine path is unchanged. The charged Po step
(three targets) shows no No one action and still offers no skip.

## The screens

`tableProjection` carries `skippable` from `canSkipStep` for the open step.
The dock and the step sheet render the Skip button only when it is true. A Po
step that accepts zero targets replaces it with the named No one action, so a
mandatory step shows its real choices instead of a generic skip. The same
projection is the single source for both surfaces.

## Replay

The refusals start at ruleset version `tb-bmr-snv-2026-11-19`, the pattern the
engine already uses for a changed rule. A command recorded under an earlier
version keeps the old skip, so its journal, notes and log ids replay as
written; only a command sent under the current version is refused. Saved games
store the state, not the command decisions, and are unaffected.

## What does not move

- The command payloads, the lifecycle guard, the conditional appenders and
  the log lines of an allowed skip.
- `pruneDeadSteps`, which marks a dead actor's step done and skipped without
  the command.
- The Po's resolver, her `record-no-one` intent and the queue builder's
  three-target bounds.

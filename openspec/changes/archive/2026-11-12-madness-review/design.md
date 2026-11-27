# Design

## State and transition

The existing madness effect stores `decidedDay`, `decidedPenalty` and `decidedReason`. Add one domain query that returns active madness effects for the current day whose `decidedDay` is not the day number. `endDay` rejects before mutating state when that query is non-empty. The response names the remaining count and player IDs so Validate, Preview and Apply report the same blocker. Each review command can name an effect ID, so one player affected by both Cerenovus and Mutant receives a separate decision for each condition.

An `execute` choice continues through the existing `executeByDecision` path and ends the day. A `none` choice records the Storyteller's reason without ending the day. If the Storyteller later chooses `execute` for a token already marked `none`, allow that single upgrade while the day is still open and no execution has occurred; do not allow repeated executions or downgrading an execution.

## Interface

The application read model exposes all active madness effects for the current day with each effect's target and whether it has been reviewed. The DayCard shows a host-only checklist. Each entry names the affected player and the madness condition, explains that the Storyteller judges whether the player tried to convince the group, and requires a reason for either outcome. The end-day preview remains authoritative and shows the engine's blocker if a review is missing.

## Limits

The app cannot observe table conversation and must not decide whether a player was mad enough. This change prevents forgetting to review a known madness effect; it does not detect violations automatically or resolve other host-adjudicated mechanics.

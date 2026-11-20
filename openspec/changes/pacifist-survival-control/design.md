# Design

## Problem

`survivalAllowed(state, playerId, at)` lives in `day.ts` and is used by both
execution commands. The console cannot call it, so it re-derived the condition
from the script and the living roster. Three copies diverge: the day card's role
list, the dock's living-Pacifist test and the engine's impairment-aware rule.

## Change

One exported wrapper computes the day at the current clock and delegates to the
same private function the commands use:

```ts
export function survivesExecutionAllowed(state: GameState, playerId: string): boolean
```

`src/application/read-models/table.ts` exposes `survivalProjection(state,
targetId)`; both the day card and the dock call it. The projection is the only
source of the control's visibility, so UI acceptance and engine acceptance
cannot disagree.

The draft's `executeSurvives` is cleared when the target changes, on the day
change, and after an accepted execution. A flag recorded for target A can never
be sent with target B.

## Why not a role-support lookup

The support entry describes whether a role is verified, not whether its ability
applies now. Impairment and the target's alignment are runtime facts, so the
check belongs to the engine and reaches the UI through a read model.

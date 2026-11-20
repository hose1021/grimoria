# Design

## Contract

`DeathContext` exposes only facts: the dead seat and role, cause, the living
count before the death, living player and Minion ids, the death time, and
read-only predicates for impairment, names, roles and existence. It never
exposes `GameState` or a mutable player.

`DeathDecision` has three arms: `inherit` names the heir and the source, and
`choose-heir` returns the named options; `no-effect` means no succession.

## Coordinator

`resolveDeathCapability` builds the context, calls the module's
`death-trigger.onDeath`, and applies:

- `inherit` through `becomeDemon`, returning the existing `DeathOutcome`;
- `choose-heir` as the existing `pendingInheritance` payload;
- `no-effect` as `{ inherited: false }`.

It returns `null` when the module has no capability, so `resolveDemonDeath` can
try the Imp fallback exactly as before.

## Dependency direction

`death-ability.ts` imports `becoming.ts`, `effects.ts`, the model and the role
types. `death.ts` imports `death-ability.ts`. `death-ability.ts` must not import
`death.ts`; otherwise `death -> death-ability -> death` would cycle.

## Day-action coordinator

`applyDayCapability` finds the module's `day-action` capability for the action,
builds the engine-side registration fact, and applies the decision:

- `record` returns the role's result to the command (hit, miss, impaired);
- `effects` applies a `kill` through the shared death path; when `succession` is
  set, it resolves the Demon succession and checks the win;
- `no-effect` returns a miss.

The Slayer module owns only the rule: impairment, the registered-Demon check and
the kill intent. `day.ts` keeps validation, the public choice log, the miss log
and the ability-spent marker.

## Win coordinator

`resolveWinCapability` receives the day's execution death and returns a `win` or
`no-effect` decision. `checkWin` gathers the day execution death, asks the
executed role's module, and applies a `win` decision through `setWinner`. The
Saint owns the "executed while healthy" condition; an impaired Saint and an
execution on another day keep the existing behavior.

## Transformation coordinator

`resolveTransformationCapability` returns `replace` or a `no-effect` reason
(`impaired` or `in-play`) for one cause. `sv.ts` keeps target and role
validation, applies `replaceCharacter`, suppresses the created Demon's wake and
writes the existing notes. The Pit-Hag module owns only the impairment and
"character already in play" conditions.

## Information coordinator

`resolveInformationCapability` receives read-only neighbor and registration
facts and returns an `answer` for one info kind. `information.ts` keeps the
impaired/Vortox option handling and the step shape; the Empath module owns the
count of evil registered living neighbours.

## Removal

`RoleModule.onDeath` is deleted in the same slice. The architecture test now
allows only the two `sv-common.ts` exceptions. A new role-level engine import
fails the test.

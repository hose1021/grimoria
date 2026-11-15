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

## Removal

`RoleModule.onDeath` is deleted in the same slice. The architecture test now
allows only the two `sv-common.ts` exceptions. A new role-level engine import
fails the test.

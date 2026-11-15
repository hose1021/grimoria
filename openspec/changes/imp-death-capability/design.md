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

## Removal

`RoleModule.onDeath` is deleted in the same slice. The architecture test now
allows only the two `sv-common.ts` exceptions. A new role-level engine import
fails the test.

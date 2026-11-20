# A typed death-step capability

Issue: #211

## Why

Barber, Klutz, Sage and Sweetheart declare a legacy `deathStep` next to their
other declarations. The engine reads `roleModule(...).deathStep` directly in
five places in `sv.ts`, so the death wake cannot move to the same typed
contract as the night wake without a second accessor.

ADR 0002 and the #211 ordered work call for one typed wake contract. The Klutz
is the smallest first case: one death step, one actor predicate, no night step.

## What changes

- `RoleCapability` gains a `death-step` arm with the same `NightStepSpec` the
  legacy field carries.
- `deathStepOf(module)` reads the arm, falling back to the legacy field for the
  roles not migrated yet. `sv.ts` reads every death step through it.
- The Klutz declares its death step on the capability. Its step shape and actor
  predicate are unchanged.
- A role test pins the arm and the living-candidate refusal; the ownership
  ledger records `capability:death-step`.

## Out of scope

- Migrating Barber, Sage and Sweetheart in this change.
- Any change to the death step's effect, journal record, public projection or
  replay.

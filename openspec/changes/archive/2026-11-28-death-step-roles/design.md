# Design

## Context

`deathStepOf` prefers a `death-step` capability and falls back to the legacy
field. `nightStepFor` already prefers a `night-step` capability. Barber, Sage
and Sweetheart still use the legacy fields for both wakes.

## Decision

Move each declaration to the existing arms without changing the step:

- Barber: `night-step` and `death-step`, `timing: "other"`, the same
  `barberAfterSoberDeath`.
- Sage: `night-step` and `death-step`, `timing: "other"`, the same
  `diedByDemon` actor.
- Sweetheart: `night-step` and `death-step`, `timing: "other"`, the same
  `diedRecently` actor.

No resolver is declared. The engine still inserts the death step, applies the
swap or drunk effect and journals the result.

## Risks / Trade-offs

- Sage and Sweetheart role tests read `role.nightStep` directly; they now read
  `nightStepFor`, which is the public lookup the engine uses.
- The legacy fallback stays in `deathStepOf`; a module that declares both forms
  would prefer the arm, and the generated ledger exposes the declaration.
- The step shape and actor are the same functions, so queue order, condition
  and conditional wake insertion cannot drift.

## Test plan

- New combined role test: all three declare both arms with the same target and
  infoKind, and no resolver.
- Existing Sage/Sweetheart actor tests still pass through `nightStepFor`.
- Existing Barber/Sage/Sweetheart engine, day-action and replay tests.
- Ownership test, ledger, manifest, trace, full verify and gates.

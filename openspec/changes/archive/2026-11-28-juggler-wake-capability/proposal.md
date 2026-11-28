# The Juggler as a typed wake capability

Issue: #211

## Why

The Juggler still declares a legacy `nightStep` with a role-specific `actor`
function. The wake condition — the night after the guesses were recorded, and
never after the ability is spent — is role logic, but it sits beside the typed
`night-step` capability that the migrated roles use.

ADR 0002 and the #211 ordered work call for one typed wake contract. The
Juggler is the smallest safe first case: one step, one actor predicate, no
resolver, no first-night arm, no death step.

## What changes

- The Juggler's legacy `nightStep` becomes a `night-step` capability with
  `timing: "other"` and the same `step` shape and `actor` predicate.
- `nightStepFor`/`nightResolverFor` return the same results; the resolver stays
  undefined, so the engine keeps the existing answer path.
- The role gains a focused unit test for the arm and for the guessing-day,
  spent and night-1 predicates.
- The ownership ledger records `capability:night-step`; the role stays
  "capability + engine reference" because `day.ts` and `sv.ts` still name it
  for the guess ledger and the answer.

## Out of scope

- The other legacy wake roles (Barber, Klutz, Philosopher, Sage, Seamstress,
  Sweetheart, Witch) and any new contract surface beyond the existing
  `night-step` arm.
- The Juggler answer, guess recording and journal behavior.

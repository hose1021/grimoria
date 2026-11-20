# The Philosopher, Seamstress and Witch as typed wake capabilities

Issue: #211

## Why

The Philosopher, the Seamstress and the Witch still declare a legacy
`nightStep` with a role-specific `actor` function. Each wake condition — an
unspent once-per-game ability for the first two, and "more than three players
live" for the Witch — is role logic, but it sits beside the typed `night-step`
capability that the migrated roles use.

ADR 0002 and the #211 ordered work call for one typed wake contract. These
three are safe cases: one step each, one actor predicate, no resolver, no
first-night arm, no death step, and a fixed shape on both the first and every
later night.

## What changes

- Each role's legacy `nightStep` becomes a `night-step` capability with
  `timing: "any"` and the same `step` shape, `optional` flag, `infoKind` and
  `actor` predicate.
- `nightStepFor`/`nightResolverFor` return the same results; no resolver is
  declared, so the engine keeps its existing wake, answer and curse paths.
- Each role gains a focused unit test for the capability arm, both night
  orders and its actor predicate.
- The ownership ledger records `capability:night-step` for the three roles;
  each stays "capability + engine reference" because the S&V coordinator still
  names it for role choices, answers or the curse.

## Out of scope

- The remaining legacy wake roles (Barber, Klutz, Sage, Sweetheart) and any
  new contract surface beyond the existing `night-step` arm.
- The Philosopher's borrowed ability, the Seamstress's answer and the Witch's
  curse behavior.

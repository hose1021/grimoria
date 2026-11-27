# Design

## Problem

The night flow checked the target count for every step but checked distinctness
only in two separate places: the Trouble Brewing two-target branch and the
Seamstress completion. A Bad Moon Rising or Sects & Violets step with
`maxTargets > 1` accepted the same seat twice, and the Barber's swap returned
without a change because both names were equal.

## Change

`completeStep` gains one check after the target existence loop and before any
role-specific rule:

- the step is multi-target when `maxTargets > 1` or the Trouble Brewing mode is
  `two`;
- a repeated id returns `{ ok: false, errorCode: "error.42" }` before any
  mutation, preview or journal entry.

The Trouble Brewing duplicate branch and the Seamstress duplicate branch are
deleted; both are now unreachable. The Trouble Brewing branch keeps its count
message `error.41`.

## Why this point

It is the single write boundary every night completion passes through, so the
invariant holds for preview, apply, replay and the test fixtures alike. The
alternative, a check per role, repeats the same rule five times and leaves the
next multi-target role unprotected.

## Error text

`error.42` now says "Choose different players" rather than "Two different
players are required", because the Po's three-target step also uses it.

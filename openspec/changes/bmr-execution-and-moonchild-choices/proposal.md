# Proposal

Issue: #218

## Why

Two pinned Bad Moon Rising interactions resolved in the wrong order or at the
wrong time:

- Devil's Advocate r2594, Examples 2: "The Devil's Advocate protects the
  Zombuul. The Zombuul is executed but remains alive, so their life token is not
  flipped." The engine checked the Zombuul's first-death replacement before the
  Advocate's execution protection, so the Zombuul spent its own first death.
- Moonchild r1783, Summary: "The Moonchild kills the Goon if the Goon was good
  when the Moonchild chose them, regardless of the Goon's alignment at night."
  The engine read the Goon's alignment when the curse resolved.

## What Changes

- `bmrCannotDie` checks the Devil's Advocate execution protection before the
  Zombuul replacement. The Assassin path is unchanged.
- `moonchildChoice` stores the choice-time alignment; the resolution uses it,
  with the current alignment as the fallback for legacy saves.
- Two RED → GREEN tests and their evidence rows.

## Out of Scope

- The Assassin-versus-Zombuul conflict, where the pinned pages disagree; that
  needs an owner decision.
- The rest of the BMR audit's evidence drift.

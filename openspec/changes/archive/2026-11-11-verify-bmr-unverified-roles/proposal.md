# Proposal

Issue: #36
Parent: #19

## Why

Nine Bad Moon Rising mechanics were implemented but unverified in
`docs/rules-matrix.md`: Courtier, Innkeeper, Gambler, the Sailor's drunk
recipient, Shabaloth, the Godfather's information and kill, the Moonchild's
next-night death, the Professor's role check and once-per-game limit, and the
Fool's first death. A row without a test cannot be claimed as automated, and
two engine paths were incomplete: the Moonchild's step could not be completed
because its dead actor was skipped, and the outcome controls could resurrect a
non-Townsfolk for the Professor.

## What Changes

- Add a RED-to-GREEN test for every listed mechanic in `js/bmr.test.mjs` from
  the pinned official text.
- Complete the Moonchild next-night step: a dead actor may complete it and the
  public choice is stored on the step.
- Make the Gambler's wrong guess conditional on an unimpaired ability.
- Enforce the Professor's Townsfolk check in the outcome controls as well as in
  the step.
- Move the listed matrix rows to `verified` with their test references; the
  Storyteller decisions stay explicit host choices.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game/bad-moon-rising`: verifies the Courtier, Innkeeper, Gambler, Sailor
  drunk recipient, Shabaloth, Godfather information and kill, Moonchild
  next-night death, Professor role check and once-per-game limit, and Fool
  first death.

## Impact

- Runtime: `src/core/engine/bmr.ts`, `src/core/engine/night.ts`.
- Tests: `js/bmr.test.mjs`.
- Docs: `docs/rules-matrix.md`, `docs/rules-sources.md`.
- No schema change, migration or new dependency.

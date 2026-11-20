# Design

## Problem

`requeueForCharacter` recomputed the night queue after a character change. It
used `nightStepFor(module, night)` and refused the step when the character had
no step that night or when its printed slot was behind the current step. Both
guards are correct for a recurring ability, but a first-night-only ability is
not a recurring one: the pinned text gives it at the point a character is
created.

## Change

After the existing replacements, `requeueForCharacter` chooses:

- the gained character's step for the current night, as before; or
- the gained character's first-night step when the current night has none and
  the night is later than the first.

A first-night fallback step gets the creating step's order plus `0.1`, which
places it immediately after the step that changed the character. The existing
`makeStep`, actor resolution and duplicate-key guard apply unchanged, so a dead
actor still gets nothing and the created Demon suppression still runs first.

`nightStepFor` already returns the first-night step on night one, so the new
branch cannot double a night-one step.

## Why this point

- It is the one place every character change passes through: the Pit-Hag
  replacement and both Barber swap seats.
- It leaves the recurring-slot rule intact: a character created after its
  recurring slot still does not wake that night.
- It reuses the information path, so impairment, registration, Vortox and the
  secret-note journal behave exactly as for a dealt character.

## Alternatives considered

- Adding the step in each caller (Pit-Hag and Barber): duplicates the rule and
  invites drift; rejected.
- Treating every created character as first-night: would wake recurring roles
  that already had their slot; rejected.

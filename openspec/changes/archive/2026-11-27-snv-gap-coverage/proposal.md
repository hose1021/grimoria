# S&V mechanical-gap coverage and the Philosopher's later character

Issue: #200

## Why

The Sects & Violets audit register still lists 33 sentence-level mechanical
gaps even though most of the behavior is implemented. Two are real defects in
the Philosopher's drunk: a borrowed ability was treated as a character in play,
so the Pit-Hag was refused when it should create the chosen absent character,
and the direct Fang Gu jump write never re-reconciled the drunk, leaving a
stale effect on the wrong seat. A role correction could also create the chosen
character without making its holder drunk.

The remaining rows are either already evidenced by the existing suites or are
out of edition scope because Grimoria models neither Travellers nor exile.

## What changes

- A borrowed ability is no longer counted as a character in play. The Pit-Hag
  may create the Philosopher's chosen absent character, and the new holder
  becomes drunk through the shared reconcile.
- `manualCorrection` with `kind: "role"` reconciles the Philosopher's drunk
  after writing the corrected character.
- The direct Fang Gu jump re-reconciles the Philosopher's drunk after the new
  Fang Gu is set, so the effect follows the current holder only.
- Nineteen missing tests are added or extended across the Artist, Barber,
  Dreamer, Fang Gu, Flowergirl, Juggler, Mathematician, Mutant, Oracle,
  Philosopher, Savant, Seamstress, Snake Charmer, Vigormortis, Vortox and Witch
  rows. The register maps them as `covered-but-unmapped` with exact evidence.
- The register repins the Cerenovus and Mutant madness sentences to
  `States.r1039 § Madness`, moves the Dreamer's `not yourself or Travellers`
  sentence to its Summary, and reclassifies the Traveller/exile rows as
  `non-mechanical-exception`.
- The readiness matrix and verification trace are regenerated.

## Out of scope

- A Traveller or exile model. The rows that depend on exiling a Traveller stay
  out of edition scope.
- Any new rule mechanism: this change only reconciles the effect the pinned
  Philosopher Summary already describes.

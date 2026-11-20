# A character created mid-game starts knowing at that point

Issue: #314

## Why

Glossary r3168 defines start knowing as knowledge gained "on the first night
or, if such a character is created mid-game, at that point instead". Barber
r1757 states the same for a swap: a player who becomes a new character gains
the new ability "even if it was a 'you start knowing' ability or a 'once per
game' ability that the original character already used".

The engine only queued a new night step when the gained character had a step
for the current night and its printed slot was still ahead. A Pit-Hag-created
Clockmaker on a later night therefore held the character but never learned its
distance, and a Barber swap onto a start-knowing character did not wake the new
holder at all.

## What changes

- `requeueForCharacter` falls back to the gained character's first-night step
  when the current night has no step for it, and inserts that step immediately
  after the step that changed the character.
- A dead created character still gets no step, and a duplicate step key is
  still refused.
- The new step keeps the shared information path, so a living Vortox falsifies
  the created Clockmaker's answer like any other Townsfolk answer.

## What stays

- **The rules.** Pit-Hag r2998 still changes the character without changing the
  alignment, and Barber r1757 still swaps two characters without changing
  either alignment.
- **Created Demons.** A Demon made by the Pit-Hag still takes no normal Demon
  turn; the host records the arbitrary deaths on the Pit-Hag step.
- **Earlier rulesets.** A journal recorded before this change keeps replaying;
  the added step is produced while the engine builds the night, not by a new
  command or payload.

## Impact

No schema, storage key, command payload or role row changes. The corrected
behavior is covered by `src/core/engine/snv.test.ts`.

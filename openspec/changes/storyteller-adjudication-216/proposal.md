# Proposal

Issue: #216

## Why

Issue #216 requires every mechanically significant Storyteller decision to be
validated against the pinned legal options, to apply through the shared writer
with its reason and consequences, and to survive save, reload and replay. The
information-only class must never feed a host answer back into game state.

The audit behind this change found two gaps in that contract:

- The Dreamer (r2904) and the Sage (r3009) tell the Storyteller to show a pair,
  but the engine records only free text. The pair content is neither validated
  nor inspectable, and nothing rejects a pair that contradicts the pinned rule.
- A Pacifist survival (r2601) changes the execution outcome without a recorded
  host decision or reason; only the execution line shows that nobody died.

## What Changes

- The Dreamer step records the shown pair as one good and one evil character.
  The engine offers only legal pairs: the target's character plus a character
  of the opposite kind, any pair while impaired, and under a living Vortox only
  pairs that contain neither the target's character.
- The Sage step records the two players shown. The engine offers only pairs
  with exactly one Demon while sober, any pair while impaired, and under a
  living Vortox only pairs without the Demon.
- Both pairs are secret journal choices with a rule case, stay out of the public
  view, and survive export, import, preview, replay and undo.
- A Pacifist survival records its own secret choice line, so the reason and the
  consequence stay with the execution.
- The host-choice journal titles resolve in Russian, English and Azerbaijani.

## Out of Scope

- New adjudication for the mechanical-consequence roles already covered by
  `requires-storyteller-choice` results and their commands.
- Character-level registration for the Spy or the Recluse, and Travellers.
- A storage schema change. The pair lives in the existing night step `given`.

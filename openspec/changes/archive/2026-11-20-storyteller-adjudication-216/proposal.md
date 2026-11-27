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
  The engine offers only legal pairs: a character the target is or may register
  as, plus a character of the opposite kind; any pair while impaired; and under
  a living Vortox only pairs that contain neither the target's raw character.
  A custom script does not narrow the supported character pool.
- The Sage step records the two players shown. The engine offers only pairs
  with the Demon who killed the Sage, which the attack records on the death, so
  a later character or holder change does not move the pair. It offers any pair
  while impaired, and under a living Vortox only pairs without the killer.
- Both pairs are secret journal choices with a rule case, stay out of the public
  view, and survive export, import, preview, replay and undo.
- `RULESET_VERSION` becomes `tb-bmr-snv-2026-11-18`. A command recorded under an
  earlier version keeps its 0.4.1 free-text Dreamer and Sage answer and replays
  as written; only a current command requires the checked pair. The released
  `tb-bmr-snv-2026-11-17.4` stays supported, and an old journal imports,
  replays, undoes and continues.
- A Pacifist survival records its own secret choice line, so the reason and the
  consequence stay with the execution.
- The host-choice journal titles resolve in Russian, English and Azerbaijani.

## Out of Scope

- New adjudication for the mechanical-consequence roles already covered by
  `requires-storyteller-choice` results and their commands.
- Character-level registration for the Spy or the Recluse, and Travellers.
- A storage schema change. The pair lives in the existing night step `given`.

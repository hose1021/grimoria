# The new Demon is woken once, the night of the change

Issue: #200

## Why

Imp r3116, "How to Run": "If the Imp killed themself at night, choose an alive
Minion and replace their character token with a spare Imp token, changing
their character to the Imp. Wake the new Imp, show them the YOU ARE info
token, then show them the Imp token. Put the new Imp to sleep." Scarlet Woman
r3117 says the same for a succession: "That night, wake the new Imp, show them
the YOU ARE info token, then show them the Imp token." The new Demon is woken
once, the night it becomes the Demon.

The engine did not hold to that in two ways.

1. **The wake was repeated.** After a night self-kill the `demonchange` step
   was queued that night, but `state.night.demonChanged` stayed set when the
   night ended. `endDay` carries the flag into the next night for a daytime
   succession (`scarletwoman-day-succession`), so it queued the step a second
   time on the following night, after the new Imp's own step.
2. **A named heir waited for the next step.** When several Minions could
   inherit, the host names the heir with `chooseDemonHeir`, which did not queue
   the wake. The wake appeared when a later step of that night was completed or
   skipped, so the table showed the next role first; when the Imp's step was
   the night's last, the night ended without the wake and the next night woke
   the new Imp instead.

Both were found while the Imp moved to its module (PR #6) and kept there on
purpose, because a move changes no behavior. The owner asked for the fix.

## What changes

- `chooseDemonHeir` queues the conditional steps as soon as the heir becomes
  the Demon, so the wake is the next step of the night and the night cannot
  end before it.
- `endDay` carries the Demon-change flag only while the change still owes its
  wake: when last night's queue holds no `demonchange` step, or when a Demon
  died today. A change made last night was woken last night.
- The ruleset version becomes `tb-bmr-snv-2026-11-17.1`. A command recorded
  under `tb-bmr-snv-2026-11-10`, `tb-bmr-snv-2026-11-16` or
  `tb-bmr-snv-2026-11-17` keeps the wakes it queued, so a saved journal
  replays and undoes as it was written.

## What stays

- **A daytime succession.** A Demon who dies by day and is replaced still
  wakes the new Demon the next night (TB-SCARLETWOMAN-02), once.
- **A self-kill with one Minion or a Scarlet Woman.** The role passes inside
  the attack step and the wake is queued there, as before.
- **The step.** The `demonchange` step, its order (the Imp's slot plus a half),
  its note, its key and the table's controls are unchanged.
- **Bad Moon Rising and Sects & Violets.** The heir question comes only from
  the Imp's module, and the end of day reads the flag only after a Demon
  change. Their conditional steps are not touched.

## Impact

Behavior changes in two cases of Trouble Brewing and of custom scripts that use
the Imp: the night after a night Demon change no longer wakes the new Demon a
second time, and a named heir is woken right after the choice. No storage
format, command payload or schema changes. The ruleset version is part of a
command's fingerprint and of its seed, so commands sent from this version on
have new fingerprints and draws; recorded commands keep theirs.

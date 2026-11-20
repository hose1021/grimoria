# Only a working Tinker dies on the Tinker's night step

Issue: #200

## Why

Tinker r1782: "At any time, you may decide that the Tinker dies." States
r1039: "A drunk or poisoned player has no ability." The Tinker's death is the
Tinker's own ability, so a drunk or poisoned Tinker does not die from it, and
it kills no one else.

The engine has two paths to that death and they disagreed.

1. **By day**, the `tinkerDeath` command refuses a drunk or poisoned Tinker
   (`error.59`), as the `Tinker death` requirement says.
2. **On the night step**, the outcome (`recordBmrOutcome`, also reached
   through `completeNightStep` with `deathIds`) let the host mark the death
   of a drunk or poisoned Tinker, and the death of any other player, as an
   ability death of the Tinker.

The difference was found while the Tinker moved to its module
(`bmr-tinker-po-shabaloth-night-step`, PR #20) and kept there on purpose,
because a move changes no behavior. The owner asked for the fix.

## What changes

- On the Tinker's step the outcome refuses a death of any player other than
  the Tinker (`error.51`), alone or beside the Tinker's own.
- It refuses the Tinker's death while the Tinker is drunk or poisoned
  (`error.59`), the same check and code as by day.
- The ruleset version becomes `tb-bmr-snv-2026-11-17.2`. A command recorded
  under `tb-bmr-snv-2026-11-10`, `tb-bmr-snv-2026-11-16`,
  `tb-bmr-snv-2026-11-17` or `tb-bmr-snv-2026-11-17.1` keeps the deaths it
  marked, so a saved journal replays and undoes as it was written.

## What stays

- **A sober Tinker.** The host still marks the Tinker's death on the step's
  outcome or by day, with `cause: "ability"`, and the death consequences and
  the win check run as before. Protection works as before.
- **The step.** The Tinker's resolver returns `no-effect`, healthy or
  impaired; the step, its order, its note and its key are unchanged.
- **The table.** The Tinker's step offers only the Tinker's own death and
  their survival, so no screen changes. A refused death shows the existing
  rejection, and the host can mark the Tinker alive instead.
- **Other roles.** Every other step's outcome is untouched.

## Impact

Behavior changes in Bad Moon Rising and in custom scripts with the Tinker:
the Tinker's night step refuses a drunk or poisoned Tinker's death and any
other player's death. No storage format, command payload or schema changes.
The ruleset version is part of a command's fingerprint and of its seed, so
commands sent from this version on have new fingerprints and draws; recorded
commands keep theirs.

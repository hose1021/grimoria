# Only a resurrecting ability brings a player back at night

Issue: #200

## Why

Professor r1775: "Once per game, at night*, choose a dead player: if they
are a Townsfolk, they are resurrected." Shabaloth r1790: "A dead player you
chose last night might be regurgitated." They are the only Bad Moon Rising
abilities that bring a dead player back.

The outcome of a Bad Moon Rising night step (`recordBmrOutcome`, also
reached through `completeNightStep` with `resurrectId`) brought back the dead
player the host marked on any step. The Professor's and the Shabaloth's
steps checked their own rule; every other step took the resurrection without
a check. The table offers a resurrection only where the step's
`canResurrect` is set, so the gap was open to a command, a saved journal or
a future screen, not to a tap.

The gap was found while the Tinker's night death was fixed
(`bmr-tinker-night-death`, PR #21): the Tinker's step brought a dead Gossip
back. The owner asked for the fix.

## What changes

- The outcome refuses a resurrection on a step whose `canResurrect` is not
  set, with `error.51`, before it changes anything. Only the Professor and
  the Shabaloth declare `canResurrect`, and the Shabaloth blocked by the
  Exorcist keeps it, so the refusal covers every other step, a Lunatic shown
  the Shabaloth included.
- The ruleset version becomes `tb-bmr-snv-2026-11-17.3`. A command recorded
  under `tb-bmr-snv-2026-11-10`, `tb-bmr-snv-2026-11-16`,
  `tb-bmr-snv-2026-11-17`, `tb-bmr-snv-2026-11-17.1` or
  `tb-bmr-snv-2026-11-17.2` keeps the resurrection it marked, so a saved
  journal replays and undoes as it was written.

## What stays

- **The Professor and the Shabaloth.** Their steps resurrect under their own
  rules, with the same checks and codes as before.
- **The steps.** No step, order, note, key or module changes; the Lunatic's
  step still copies only the target and its count from the Demon it was
  shown.
- **The table.** The resurrection picker is shown only where the step can
  resurrect, as before, so no screen changes.
- **The host's tool.** The `resurrectPlayer` command, the host's own
  correction at night, is not a step's outcome and is not changed.

## Impact

Behavior changes in Bad Moon Rising and in custom scripts with its roles:
a night step whose ability does not resurrect refuses a resurrection. No
storage format, command payload or schema changes. The ruleset version is
part of a command's fingerprint and of its seed, so commands sent from this
version on have new fingerprints and draws; recorded commands keep theirs.

# Trouble Brewing night steps as capabilities: Butler

Issue: #200

## Why

`completeStep` in `night.ts` still resolves the Butler's night choice in a
role branch. The branch writes the chosen master on the Butler's seat, pushes
a dated `butler` effect and, when the Butler is drunk or poisoned, pushes the
same effect as an inactive record. The module declares only a target mode.

`tb-night-step-capabilities` moved the Poisoner and the Monk and left the
Butler out, because the `suppressed` decision did not say what happens to a
choice that is recorded although the ability failed. This change settles that
and moves the Butler. It is the next pull request of ADR 0002 slice 2, "Night
steps: Trouble Brewing remainder".

## What changes

- `RoleEffect` gains `record-master`: the master the acting seat chose,
  written on that seat whether or not the ability works.
- `TimedEffectKind` gains `butler`.
- The coordinator gives `suppressed` one meaning for a dated effect: it is
  kept as a record that never applies, and it does not end an earlier effect.
  A role returns the same choice on both paths; it cannot leave a working
  effect behind a failed ability.
- The Butler declares a `night-step` capability for every night and resolves
  its choice in its module. `night.ts` keeps no Butler branch.
- `docs/role-ownership.md`: the Butler row moves from an engine branch to a
  typed capability with engine references (the vote check and the effect
  lookup, which are shared mechanics and not night steps).

## Impact

Behavior is unchanged. The master record, the effect record and its id, the
inactive record of an impaired choice, the step record, the notes, the log
line, the command events, the order of draws from the command ports and the
error codes stay the same, so saved games and journals replay as before. No
storage, command payload, schema or pin changes.

The Poisoner and the Monk return `suppressed` without effects, so the new
meaning of a suppressed dated effect does not touch them. The Pukka returns
only `suspend-death` intents on that path, which are applied as before.

The vote check, the Imp attack and the Trouble Brewing information roles are
not part of this change.

# Proposal

Issue: #325

## Why

`CorrectionChange` accepts six kinds, but the correction dialog offered only
alive, role, twin partner, reminder and winner rollback. A stale poison or a
Witch curse could not be deactivated, and a wrong shown role could not be
corrected, although the engine accepts both.

The Witch curse itself is placed by the Witch's night step. Its death trigger
needs a nomination, and the app's day contract is to record only the execution
result, not to run nominations at the table. The Storyteller therefore resolves
the curse death through the correction dialog: deactivate the curse effect and
record the death with a reason.

## What changes

- The correction dialog offers a shown-role change and an effect deactivation.
- The effect list holds the selected player's active effects, so the host picks
  a real effect id rather than typing one.
- The reason is still required; the journal records it.

## What stays

- No engine or command change: `manualCorrection` already validates both kinds.
- Nomination running stays out of the app; the day contract is unchanged.

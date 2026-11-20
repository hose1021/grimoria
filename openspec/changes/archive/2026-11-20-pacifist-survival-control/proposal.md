# Proposal

Issue: #317

## Why

Two controls offered the Pacifist survival with their own conditions. The day
card showed it for any script containing `pacifist`, `sailor`, `fool`,
`devilsadvocate` or `zombuul`; the dock showed it for any living Pacifist and a
non-evil target, without checking impairment. The engine accepts it only for a
good target while a living, unimpaired Pacifist is in play. A host could see a
legal-looking checkbox and receive `error.57`, and a Sailor or Fool script with
no Pacifist offered a control that can never work.

The condition was module-private (`survivalAllowed`), so the console copied it.

## What changes

- `survivesExecutionAllowed(state, playerId)` is exported from the engine and
  re-exported as the read-model projection `survivalProjection`.
- Both controls render from that projection and nothing else.
- A target change, the day change and an accepted execution clear the survival
  flag, so a stale checkbox cannot send `survives: true` for a new target.

## What stays

- The engine rule and `error.57`; no command payload or state change.
- The role-support note under the control.

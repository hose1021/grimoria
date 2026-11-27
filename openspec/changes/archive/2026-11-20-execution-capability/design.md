# Design

## Contract

`ExecutionContext` exposes the executed seat and role, its real team, the
execution cause, the recorded death, the living count, the current time and
two read-only predicates: whether a role has a living unimpaired holder, and
the role of a seat.

`ExecutionDecision` names the outcome. The Pacifist returns `survives` only for
a good target with a living unimpaired Pacifist; every other case is
`no-effect`.

## Coordinator

`resolveExecutionCapability` calls the declared arm. `survivalAllowed` keeps
its no-target and evil-target guards, then asks the Pacifist module. A
`survives` decision allows the existing `options.survives` path; anything else
keeps the existing `error.57`.

This is a host choice: the capability says an execution *may* be survived, not
that it must. `executeByDecision` still requires the host's survival flag.

## Compatibility

No storage, command, journal, privacy or replay change.

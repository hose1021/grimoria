# Design

## Contract

The arm is intentionally static: a registration value set does not depend on
the game state. `{ kind: "adjudication", case: "registration", options }`
keeps the role module free of engine imports and avoids a read-only context
that no current rule needs.

The engine coordinator (`legalRegistrations`) looks up the role module and
returns the declared options, or an empty list. `registrationError` then
validates the host answer exactly as before.

## Future arms

A dynamic adjudication case (a legal answer that depends on facts) can add a
`resolve(context)` variant with a read-only context when a real role needs it.
The union grows with that consumer, not before.

## Compatibility

The Spy and Recluse values are identical to the removed engine map. No storage,
command, journal, privacy or replay change.

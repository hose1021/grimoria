## MODIFIED Requirements

### Requirement: Idempotency ledger

Apply SHALL record a command id bound to a canonical fingerprint of type,
payload and ruleset version in `state.applied`; a repeated id with the same
fingerprint SHALL be a no-op, a repeated id with a different payload SHALL be
rejected, and an unsupported ruleset version SHALL be rejected before any
mutation. The ledger SHALL include record-only commands. Coalescing a
record-only journal entry SHALL NOT remove the idempotency record.

**Source**: `SPEC.md` "State v4"
**Tests**: `src/core/engine/commands.test.ts`, `src/application/store/create-game-store.test.ts`

#### Scenario: Repeated identical command

- **WHEN** the same command id, type and payload are applied twice
- **THEN** the second apply reports success without a second state change

#### Scenario: Coalesced record-only command

- **WHEN** a record-only command was followed by a later command of the same
  type and the first command is applied again
- **THEN** the second apply is idempotent, the later value stays current and no
  write occurs

#### Scenario: Unsupported ruleset version

- **WHEN** a command declares a ruleset version the app does not support
- **THEN** the command is rejected and the state is byte-identical

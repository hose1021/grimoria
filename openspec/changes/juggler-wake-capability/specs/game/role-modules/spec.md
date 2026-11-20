# Spec Delta

## ADDED Requirements

### Requirement: The Juggler wake is a night-step capability

The Juggler role module SHALL declare its wake through a `night-step`
capability with `timing: "other"`, SHALL keep the same number step and actor
predicate, and SHALL NOT declare a resolver. The engine SHALL keep the answer,
the guess ledger and the journal behavior.

**Source**: [Juggler r2401](https://wiki.bloodontheclocktower.com/index.php?title=Juggler&oldid=2401); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #211](https://github.com/hose1021/grimoria/issues/211)
**Tests**: `src/core/roles/juggler/role.test.ts`, `src/core/roles/night-step.test.ts`

#### Scenario: Night after the guesses

- **WHEN** the Juggler's guessing day is the previous day and the ability is unspent
- **THEN** the night-step capability builds the number step and the Juggler wakes

#### Scenario: Guessing day or spent

- **WHEN** the current night is the guessing day, or `used.juggler` is set
- **THEN** the actor returns no wake

#### Scenario: First night

- **WHEN** the first night queue asks for the Juggler step
- **THEN** no step is built

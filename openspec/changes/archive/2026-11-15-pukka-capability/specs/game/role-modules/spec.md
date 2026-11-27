# Spec Delta

## ADDED Requirements

### Requirement: Pukka delayed poison capability

The Pukka role module SHALL resolve its night step through the capability
contract. It SHALL receive the night number and the pending deaths it owns, and
SHALL return the poison, delayed death, suspension, poison release and previous
death resolution as typed intents. The engine SHALL apply those intents through
the shared effect helpers in the order returned, with no Pukka branch in the
edition file.

**Source**: [Pukka r3074](https://wiki.bloodontheclocktower.com/index.php?title=Pukka&oldid=3074); [Issue #200](https://github.com/hose1021/grimoria/issues/200); [ADR 0001](../adr/0001-role-capability-contract.md)
**Tests**: `src/core/roles/pukka/role.test.ts`, `src/core/engine/bmr.test.ts`

#### Scenario: New poison before the previous death

- **WHEN** a healthy Pukka chooses a new target and owns a pending death
- **THEN** the resolver returns the new poison, the new delayed death and the
  resolution of the old pending, in that order, and the engine applies them

#### Scenario: Self-target suspension

- **WHEN** the Pukka chooses itself
- **THEN** the resolver treats the new poison as first, suspends the previous
  death until the source is healthy, and releases the source's other poisons

#### Scenario: Impaired Pukka

- **WHEN** the Pukka is drunk or poisoned
- **THEN** the resolver returns the `suppressed` decision, suspends only the due
  pending deaths, writes `note.pukkaSuspended` and no new poison or kill

#### Scenario: Effect identity

- **WHEN** the resolver output is applied
- **THEN** the poison and pending-death ids, fields, step result and command
  outcome are the same as before the migration

### Requirement: Delayed-effect intents and suppressed note

The capability contract SHALL expose `poison`, `delay-death`, `suspend-death`,
`release-poisons` and `resolve-death` intents, SHALL let an `effects` decision
carry a rule note and a step result, and SHALL let `suppressed` carry
suspension intents, a rule note and a result.

**Source**: [Issue #200](https://github.com/hose1021/grimoria/issues/200), [ADR 0001](../adr/0001-role-capability-contract.md)
**Tests**: `src/core/roles/pukka/role.test.ts`, `src/core/roles/gambler/role.test.ts`, `src/core/engine/bmr.test.ts`

#### Scenario: Built-in note

- **WHEN** a resolver returns a decision without a note
- **THEN** the engine writes its generic failure note for `suppressed`

#### Scenario: Rule note and result

- **WHEN** a resolver returns a note and a result
- **THEN** the engine writes the rule note and stores the result, adding the
  actual death when a `resolve-death` intent kills

## ADDED Requirements

### Requirement: A role module declares its registration options

A role that can change how abilities register SHALL declare an `adjudication`
capability with the `registration` case and its legal values. The engine SHALL
read those values from the role module, SHALL keep the host-choice case, reason,
journal and answer validation, and SHALL return no values for a role without the
capability.

**Source**: [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118), [Recluse r3105](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3105)
**Tests**: `src/core/engine/host-choice.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: Spy registers good

- **WHEN** the host chooses a Spy registration
- **THEN** the engine offers only `good` from the Spy module

#### Scenario: Recluse registers evil or demon

- **WHEN** the host chooses a Recluse registration
- **THEN** the engine offers only `evil` and `demon` from the Recluse module

#### Scenario: A role without the capability

- **WHEN** another role is named for a registration
- **THEN** the engine offers no values and rejects the answer

#### Scenario: A registration is answered

- **WHEN** the host supplies a legal value
- **THEN** the existing command, journal and information behavior is unchanged

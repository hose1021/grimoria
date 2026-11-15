## MODIFIED Requirements

### Requirement: A role module declares its death behavior

Role-specific death handling SHALL run from the dead role's module through the
`death-trigger` capability, SHALL return a read-only `inherit`, `choose-heir` or
`no-effect` decision, and SHALL keep the existing state effects, result codes,
journal entries, pending heir payload and winner reasons. The engine coordinator
SHALL apply the decision through the shared succession path.

**Source**: [Issue #212](https://github.com/hose1021/grimoria/issues/212), [Imp r3116](https://wiki.bloodontheclocktower.com/index.php?title=Imp&oldid=3116), [Scarlet Woman r3117](https://wiki.bloodontheclocktower.com/index.php?title=Scarlet_Woman&oldid=3117)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/bmr.test.ts`, `src/core/engine/snv.test.ts`

#### Scenario: A role with a death hook dies

- **WHEN** a role that declares a death capability dies
- **THEN** the capability returns its decision, the coordinator applies it, and the shared death bookkeeping still runs

#### Scenario: A role without a death hook dies

- **WHEN** a role that declares no death capability dies
- **THEN** only the shared death bookkeeping runs

#### Scenario: The Imp dies with a living Scarlet Woman

- **WHEN** the Imp dies while a living, unimpaired Scarlet Woman is in play and at least five players lived before the death
- **THEN** the capability returns `inherit` for the Scarlet Woman and the coordinator makes her the Demon

#### Scenario: The Imp self-kills with several Minions

- **WHEN** the Imp self-kills with more than one living Minion
- **THEN** the capability returns `choose-heir` with the living Minions and the engine records the existing host choice

#### Scenario: The dead role has no capability

- **WHEN** another Demon dies
- **THEN** the engine applies the Imp's fallback death capability exactly as the previous shared hook

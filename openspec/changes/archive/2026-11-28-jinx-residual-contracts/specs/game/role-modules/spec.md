# Spec Delta

## ADDED Requirements

### Requirement: The Lunatic comparison survives completion order

The engine SHALL compare the completed Lunatic choice with the completed
Demon choice when either step closes the pair. It SHALL write at most one
ABNORMAL mark for the night and SHALL NOT write one after the Mathematician
step has completed. A Demon that dies during its own step SHALL still count as
having acted.

**Source**: Lunatic r3112 ("Each night, before the Demon wakes to attack, wake
the Lunatic to act as if they were that Demon."), Imp r3116, Mathematician
r3153, Mathematician+Lunatic jinx; [Issue #475](https://github.com/hose1021/grimoria/issues/475)
**Tests**: `src/core/engine/jinxes.test.ts`

#### Scenario: Demon completed first

- **WHEN** the Demon step completes before the Lunatic step and the choices differ
- **THEN** the mark is written when the Lunatic step completes

#### Scenario: Demon dies in its own step

- **WHEN** the Demon chooses itself and dies during its own step
- **THEN** the completed choice is still compared and the mark is written

#### Scenario: Cleared ledger

- **WHEN** the Mathematician completes before a later Lunatic completion
- **THEN** no mark is added after the clear

### Requirement: A Drunk shown the Sage wakes for the pair step

The engine SHALL build the Sage death step for a Drunk whose shown role is
Sage and SHALL accept every player pair for that answer. The engine SHALL NOT
record a Recluse registration for a Drunk, because the Drunk has no Sage
ability.

**Source**: Drunk r3165 ("If that character would wake at night, the Drunk
wakes to act as if they are that Townsfolk."), Sage r3009, Recluse r3007;
[Issue #475](https://github.com/hose1021/grimoria/issues/475)
**Tests**: `src/core/engine/jinxes.test.ts`

#### Scenario: Drunk wake

- **WHEN** the Demon kills a Drunk whose shown role is Sage
- **THEN** the pair step is appended and is completable

#### Scenario: No registration

- **WHEN** the Drunk's pair names the Recluse
- **THEN** no registration is written

### Requirement: A Drunk shown the Sage is marked only for a false pair

The Mathematician+Drunk ABNORMAL mark SHALL be written only when the chosen
pair is outside the true set. The true set SHALL contain the Demon that killed
the Sage and an unimpaired Recluse.

**Source**: Mathematician r3153, Mathematician+Drunk jinx, Sage r3009, Recluse
r3007; [Issue #475](https://github.com/hose1021/grimoria/issues/475)
**Tests**: `src/core/engine/jinxes.test.ts`

#### Scenario: True pair

- **WHEN** the chosen pair contains the killing Demon or the Recluse
- **THEN** no ABNORMAL mark is written

#### Scenario: False pair

- **WHEN** the chosen pair contains neither
- **THEN** one ABNORMAL mark is written

### Requirement: The Sage registration replays from the pair

The implied Recluse registration SHALL be derived from the recorded pair, the
death record and the effect graph. A journal replay SHALL reproduce the same
canonical state and one host-choice line.

**Source**: Sage r3009, Recluse r3007, Recluse+Sage jinx; [Issue #475](https://github.com/hose1021/grimoria/issues/475)
**Tests**: `src/core/engine/jinxes.test.ts`

#### Scenario: Replay

- **WHEN** a game with an implied Sage registration is replayed
- **THEN** the replayed canonical state equals the saved state

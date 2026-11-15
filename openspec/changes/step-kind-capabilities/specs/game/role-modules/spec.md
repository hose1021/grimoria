## ADDED Requirements

### Requirement: A role module declares its day action

A role with a daytime action SHALL declare a `day-action` capability that
receives read-only facts and returns `effects`, `record` or `no-effect`. The
engine coordinator SHALL keep validation, the public choice log, the shared
death path, Demon succession, the win check and the spent marker.

**Source**: [Slayer r3181](https://wiki.bloodontheclocktower.com/index.php?title=Slayer&oldid=3181)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: A healthy Slayer shoots the Demon

- **WHEN** the Slayer target is alive and registers as a Demon
- **THEN** the capability returns a kill effect and the engine kills the target, resolves succession and checks the win

#### Scenario: A Slayer misses

- **WHEN** the target is not a Demon or is already dead
- **THEN** the capability returns a miss result, the shot is spent and the existing miss log is written

#### Scenario: An impaired Slayer

- **WHEN** the Slayer is drunk or poisoned
- **THEN** the capability returns an impaired miss, the shot is spent and the existing secret failure log is written

#### Scenario: A Recluse registers as the Demon

- **WHEN** the host answers that a healthy Recluse registers as a Demon
- **THEN** the capability receives that fact and returns the kill effect

### Requirement: A role module declares its win contribution

A role with a win contribution SHALL declare a `win` capability that receives
read-only facts and returns `win` or `no-effect`. The engine SHALL gather the
day's execution death, ask the executed role's module, and apply a `win`
decision through the shared winner path.

**Source**: [Saint r2865](https://wiki.bloodontheclocktower.com/index.php?title=Saint&oldid=2865)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: A healthy Saint is executed

- **WHEN** the Saint dies by execution while healthy on the current day
- **THEN** the capability returns a win for evil with reason `saint` and the engine declares it

#### Scenario: An impaired Saint is executed

- **WHEN** the Saint is drunk or poisoned at the execution
- **THEN** the capability returns no effect and good does not lose from that execution

#### Scenario: The execution was on another day

- **WHEN** the execution death belongs to an earlier day
- **THEN** the engine does not pass it as the current execution and the Saint does not win

### Requirement: A role module declares its transformation rule

A role that changes another character SHALL declare a `transformation`
capability for its cause. The capability SHALL return `replace` or a `no-effect`
reason; the engine SHALL keep target and role validation, apply the shared
`replaceCharacter`, suppress a created Demon's wake and write the existing
notes.

**Source**: [Pit-Hag r2988](https://wiki.bloodontheclocktower.com/index.php?title=Pit-Hag&oldid=2988)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: A legal Pit-Hag change

- **WHEN** the target and an absent character are chosen and the Pit-Hag is healthy
- **THEN** the capability returns `replace` and the engine changes the character atomically

#### Scenario: The character is already in play

- **WHEN** the chosen character has a holder
- **THEN** the capability returns `no-effect` with reason `in-play` and the engine writes the existing no-op note

#### Scenario: The Pit-Hag is impaired

- **WHEN** the Pit-Hag is drunk or poisoned
- **THEN** the step records the existing failure note without changing a character

#### Scenario: A Demon is created

- **WHEN** the replacement character is a Demon
- **THEN** the engine suppresses its wake and lets the host record the night deaths

### Requirement: A role module declares its information rule

An information role SHALL declare an `information` capability for its info
kind. The capability SHALL receive read-only neighbour, registration and
impairment facts and return an `answer` or `no-effect`; the engine SHALL keep
the step shape, the impaired/Vortox option handling and the public/private
projections.

**Source**: [Empath r3169](https://wiki.bloodontheclocktower.com/index.php?title=Empath&oldid=3169)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: Empath counts evil neighbours

- **WHEN** the Empath step resolves with living neighbours
- **THEN** the capability counts those whose registered team is evil and returns the number

#### Scenario: Spy and Recluse registration

- **WHEN** the host records a Spy or Recluse registration
- **THEN** the capability receives the registered team through the context and the count reflects it

#### Scenario: An impaired Empath

- **WHEN** the Empath is drunk or poisoned
- **THEN** the engine still offers the legal host numbers and the capability returns the computed count

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

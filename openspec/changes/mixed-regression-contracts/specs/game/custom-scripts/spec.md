# Spec Delta

## ADDED Requirements

### Requirement: A mixed script applies the shared protection rules

A certified mixed script SHALL apply the shared protection rules to every
death path: the Monk and Soldier against a Demon attack, and the BMR Fool, Tea
Lady, Sailor, Zombuul, Innkeeper and Devil's Advocate. The death cause SHALL
stay the real one and Demon attribution SHALL be separate. A prevented death
SHALL be journaled and SHALL leave the player alive.

**Source**: Monk r3124, Soldier r3121, Fool r2636, Tea Lady r1777, Sailor r1768,
Zombuul r3022, Innkeeper r3160, Devil's Advocate r2594, Fang Gu r2974;
[Issue #220](https://github.com/hose1021/grimoria/issues/220)
**Tests**: `src/core/engine/mixed.test.ts`

#### Scenario: Monk protection

- **WHEN** a mixed S&V Demon attacks a Monk-protected player
- **THEN** the player stays alive and a secret prevention is journaled

#### Scenario: Soldier

- **WHEN** a mixed S&V Demon attacks the Soldier
- **THEN** the Soldier stays alive

#### Scenario: Fool

- **WHEN** a mixed S&V Demon attacks the Fool for the first time
- **THEN** the Fool stays alive and its first-death ability is spent

#### Scenario: Innkeeper

- **WHEN** a mixed non-Demon ability attacks an Innkeeper-protected player
- **THEN** the player stays alive

#### Scenario: Devil's Advocate

- **WHEN** a mixed game executes a Devil's Advocate–protected player
- **THEN** the player stays alive

#### Scenario: Fang Gu jump

- **WHEN** the Fang Gu chooses a Monk-protected Outsider
- **THEN** no jump happens and the target and the old Demon stay alive

### Requirement: A mixed script applies the shared win rules

A mixed script SHALL apply the Vortox day-end win, the Evil Twin good-twin
execution and the Mastermind extra day when those characters are in the script.
The Mastermind extra day SHALL suspend the win while active. The shared Mayor
and demon-dead/two-alive rules SHALL stay unchanged.

**Source**: Vortox r3017, Evil Twin r3101, Mastermind r2993, Mayor r2995;
[Issue #220](https://github.com/hose1021/grimoria/issues/220)
**Tests**: `src/core/engine/mixed.test.ts`

#### Scenario: Vortox

- **WHEN** a mixed day ends with a living Vortox and no execution
- **THEN** evil wins with reason `vortox`

#### Scenario: Mastermind

- **WHEN** a mixed game executes the Demon while a Mastermind is active
- **THEN** the win is suspended and the extra day is armed

### Requirement: A mixed transformation swaps characters across editions

A death-triggered transformation in a mixed script SHALL swap two players'
characters even when the two roles come from different editions, and SHALL
keep the shared role and team records consistent.

**Source**: Barber r1757; [Issue #220](https://github.com/hose1021/grimoria/issues/220)
**Tests**: `src/core/engine/mixed.test.ts`

#### Scenario: Barber swap

- **WHEN** a mixed Barber swaps a TB and an S&V character
- **THEN** each player holds the other's character

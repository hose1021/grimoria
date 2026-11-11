# Spec Delta

## ADDED Requirements

### Requirement: Unified domain model coverage

The state model SHALL map every domain notion — player, character, team, life
and death, registered death, the Drunk and Lunatic masks, ability health,
drunk and poison with a source and an interval, protections and immunities,
temporary effects, reminders, used abilities, Storyteller choices, day and
night, step order, and win candidates — to a stored field or to an explicit
derivation, SHALL keep that map in `design.md`, and SHALL NOT store a value the
effect graph or the win check derives.

**Source**: [Glossary r3168](https://wiki.bloodontheclocktower.com/index.php?title=Glossary&oldid=3168); [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039)
**Tests**: `src/core/model/state.test.ts`, `js/engine.test.mjs`, `js/bmr.test.mjs`

#### Scenario: Notion owned by a field

- **WHEN** the host records a death
- **THEN** `player.alive`, `player.deadAt` and the `deaths` history hold it, and no second death flag exists

#### Scenario: Notion owned by a derivation

- **WHEN** the engine needs to know whether an ability is healthy
- **THEN** it reads the poison/drunk effect graph through `isImpaired` and no player field mirrors the result

### Requirement: Effect source, target and interval

`validateState` SHALL reject a saved or imported effect that has no existing
source player, no existing target player, no interval, or a malformed interval;
it SHALL accept an open-ended effect whose `expires` is absent or `null`.

**Source**: [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039) (drunk and poison timing and persistent effects); [Glossary r3168](https://wiki.bloodontheclocktower.com/index.php?title=Glossary&oldid=3168) (poison, drunk)
**Tests**: `src/core/model/state.test.ts`

#### Scenario: Missing source or target

- **WHEN** an effect names no source player or no target player
- **THEN** validation fails with a message naming that field

#### Scenario: Missing or malformed interval

- **WHEN** an effect has no `start`, or `start` or `expires` lacks a phase or an integer cycle number
- **THEN** validation fails with `Invalid effect interval.`

#### Scenario: Open-ended effect

- **WHEN** a No Dashii, Sweetheart or Pukka effect has no expiry
- **THEN** validation accepts it and the effect stays active until the game ends

### Requirement: Legacy saves load under the interval rule

A saved game from schema v2 or v3 SHALL still load and validate after the
effect interval rule, including a save that already contains an effect, and
migration SHALL NOT invent an interval for an effect that lacks one.

**Source**: [Glossary r3168](https://wiki.bloodontheclocktower.com/index.php?title=Glossary&oldid=3168); `SPEC.md` "State v4"
**Tests**: `src/core/model/state.test.ts`, `js/store.test.mjs`, `js/scripts.test.mjs`

#### Scenario: v3 save with an effect

- **WHEN** a v3 save containing a dated effect migrates
- **THEN** it becomes schema v4 and `validateState` returns no errors

#### Scenario: Undated legacy effect

- **WHEN** a legacy save contains an effect with no `start`
- **THEN** migration leaves it as it is and validation rejects it instead of inventing a cycle

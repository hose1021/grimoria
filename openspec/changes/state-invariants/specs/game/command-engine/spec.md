# Spec Delta

## ADDED Requirements

### Requirement: Single current character and resolvable player references

Every player SHALL hold exactly one current character from the active script and
exactly one alignment. Every record that names a player SHALL resolve to a player
in the state: seat order, players, effects, deaths, executions, night actors,
nominations, morning deaths, the day execution, the Butler master, the Mastermind
record and the setup player references. A resolved command SHALL leave the state
with no dangling reference.

**Source**: [Issue #32](https://github.com/hose1021/grimoria/issues/32), [Issue #19](https://github.com/hose1021/grimoria/issues/19) "Инварианты"; [Abilities](https://wiki.bloodontheclocktower.com/Abilities)
**Tests**: `js/invariants.test.mjs`, `js/commands.test.mjs`

#### Scenario: Dealt game is consistent

- **WHEN** a legal game is dealt
- **THEN** each player has one in-script character and one alignment, and `checkInvariants` reports no problem

#### Scenario: Dangling player reference is rejected

- **WHEN** a nomination, morning death, day execution, Butler master, Mastermind record, setup reference, effect, death, execution or night actor names a player that does not exist
- **THEN** `checkInvariants` reports the broken reference

### Requirement: Spent once-per-game abilities and dead wakes

A once-per-game ability SHALL stay spent until the game legally restores it (for
example, a new game). A dead player SHALL NOT wake for a night step; only a role
whose rule triggers on death SHALL keep or gain its step.

**Source**: [Issue #32](https://github.com/hose1021/grimoria/issues/32); [Ravenkeeper](https://wiki.bloodontheclocktower.com/Ravenkeeper); [Abilities](https://wiki.bloodontheclocktower.com/Abilities)
**Tests**: `js/invariants.test.mjs`, `js/engine.test.mjs`

#### Scenario: Reusing a spent ability

- **WHEN** a Slayer uses the ability a second time in the same game
- **THEN** the command is rejected and the spent flag is unchanged

#### Scenario: New game restores abilities

- **WHEN** a new game starts
- **THEN** the spent flags are cleared

#### Scenario: Dead player before their wake

- **WHEN** a player dies before their night step
- **THEN** that step is skipped and the player does not wake

#### Scenario: Rule exception on death

- **WHEN** the Ravenkeeper is killed at night
- **THEN** its step is added with `actorAlive` false

### Requirement: Role-specific effect source ending

When an effect's source ends, the effect SHALL be removed or kept according to
that role's rule, not a general source-death assumption. The Poisoner's poison
and the Monk's protection end when the source dies; the Sweetheart's on-death
drunk stays active; a Philosopher-granted drunk ends when the Philosopher dies;
the Snake Charmer's poison is permanent and outlives its source.

**Source**: [Issue #32](https://github.com/hose1021/grimoria/issues/32); `docs/rules-sources.md` "Poison", "Monk", Sweetheart, Philosopher and Snake Charmer rows
**Tests**: `js/invariants.test.mjs`, `js/commands.test.mjs`

#### Scenario: Impairing source dies

- **WHEN** a poison or drunk effect's source dies
- **THEN** the effect stays active only for the roles whose rule says so

#### Scenario: Protection source dies

- **WHEN** the Monk dies before the protection ends
- **THEN** the protection is inactive

### Requirement: Final win waits for mandatory effects and Demon replacement

A final win SHALL NOT be declared while a mandatory immediate effect or a Demon
replacement is unresolved. A pending demon-inheritance SHALL block the win check,
and a winning death SHALL be recorded together with the win, not before it.

**Source**: [Issue #32](https://github.com/hose1021/grimoria/issues/32); [Imp](https://wiki.bloodontheclocktower.com/Imp); [Scarlet Woman](https://wiki.bloodontheclocktower.com/Scarlet_Woman)
**Tests**: `js/invariants.test.mjs`, `js/engine.test.mjs`

#### Scenario: Unresolved heir blocks the win

- **WHEN** the Imp self-kills while several Minions are eligible
- **THEN** no winner is declared and the heir choice is queued

#### Scenario: Winner while the heir is pending

- **WHEN** a state has a winner and a pending demon-inheritance step
- **THEN** `checkInvariants` rejects the state

#### Scenario: Winning death is applied with its record

- **WHEN** the Slayer kills the last Demon
- **THEN** the death is recorded and the good win is declared in the same state

### Requirement: Replay, undo and command idempotency

Replaying the recorded command and event journal SHALL reproduce the current
canonical state and the same domain events. Restoring the pre-command snapshot
and replaying the undone command SHALL stay consistent. Re-applying a command id
SHALL NOT record a second death or stack a second effect.

**Source**: [Issue #32](https://github.com/hose1021/grimoria/issues/32); [Issue #19](https://github.com/hose1021/grimoria/issues/19) "Инварианты"
**Tests**: `js/invariants.test.mjs`, `js/commands.test.mjs`, `src/application/store/create-game-store.test.ts`

#### Scenario: Journal replay

- **WHEN** the recorded commands are applied to the initial state with their pinned timestamps
- **THEN** the canonical state and the derived events equal the live ones

#### Scenario: Undo then replay

- **WHEN** the pre-command snapshot is restored and the undone command is applied again
- **THEN** the state equals the state before the undo

#### Scenario: Repeated command

- **WHEN** the same command id is applied twice
- **THEN** the second application is idempotent and no death or effect is duplicated

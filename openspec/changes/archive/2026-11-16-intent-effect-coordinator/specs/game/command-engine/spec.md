# Spec Delta

## ADDED Requirements

### Requirement: One coordinated lethal resolution order

Every lethal action SHALL resolve through one order: intent, attack or
execution, protection and redirect, death or execution record, on-death and
character change, then win. The engine SHALL NOT skip or repeat a stage. A
stage that finds the action prevented SHALL stop the later death,
transformation and win stages.

**Source**: [Issue #212](https://github.com/hose1021/grimoria/issues/212); [Monk r3124](https://wiki.bloodontheclocktower.com/index.php?title=Monk&oldid=3124), [Fool r2636](https://wiki.bloodontheclocktower.com/index.php?title=Fool&oldid=2636), [Assassin r1786](https://wiki.bloodontheclocktower.com/index.php?title=Assassin&oldid=1786), [Fang Gu r2974](https://wiki.bloodontheclocktower.com/index.php?title=Fang_Gu&oldid=2974), [Mastermind r2993](https://wiki.bloodontheclocktower.com/index.php?title=Mastermind&oldid=2993) pinned in `docs/rules-matrix.md`
**Tests**: `src/core/engine/coordinator.test.ts`

#### Scenario: Protection resolves before the Mayor redirect

- **WHEN** the Monk protects the Mayor and the Demon attacks the Mayor
- **THEN** no player dies tonight and no redirect choice is offered, because the protected Mayor was never going to die

#### Scenario: Earlier protection spares the Fool

- **WHEN** the Tea Lady or the Innkeeper prevents the Fool's death
- **THEN** the Fool remains alive and keeps its once-per-game ability

#### Scenario: A bypass skips protection but not impairment

- **WHEN** a sober Assassin attacks a Tea Lady neighbour
- **THEN** the target dies, and **WHEN** the Assassin is drunk or poisoned instead, nobody dies

#### Scenario: Transformation follows death and precedes the win

- **WHEN** the Fang Gu kills an Outsider for the first time
- **THEN** the old Fang Gu dies, the Outsider becomes an evil Fang Gu, and no winner is declared between those two changes

#### Scenario: Win is the last stage

- **WHEN** the Demon dies by execution while a living Mastermind could extend play
- **THEN** no good winner is declared, and the extra day decides the winner

### Requirement: Atomic multi-stage command outcome

One command SHALL commit every stage outcome together: the death record,
execution record, effect change, character change and winner SHALL appear
together or not at all. A Storyteller choice, a rejected command or a failed
save SHALL leave the pre-command records and the journal unchanged.

**Source**: [Issue #212](https://github.com/hose1021/grimoria/issues/212); [Slayer r3122](https://wiki.bloodontheclocktower.com/index.php?title=Slayer&oldid=3122), [Mayor r2995](https://wiki.bloodontheclocktower.com/index.php?title=Mayor&oldid=2995), [Pit-Hag r2998](https://wiki.bloodontheclocktower.com/index.php?title=Pit-Hag&oldid=2998) pinned in `docs/rules-matrix.md`
**Tests**: `src/core/engine/coordinator.test.ts`, `src/core/engine/commands.test.ts`, `src/application/store/create-game-store.test.ts`

#### Scenario: A redirect choice changes nothing yet

- **WHEN** a Demon attack on the Mayor needs a redirect answer
- **THEN** the command returns `requires-storyteller-choice` with no death, no execution record, no winner and no journal entry

#### Scenario: A winning Slayer shot commits death and win together

- **WHEN** a sober Slayer chooses the last living Demon
- **THEN** the same committed state holds the death record and the good win, and a preview reports the same outcome without committing it

#### Scenario: A failed save keeps no partial stage

- **WHEN** persistence fails after a command that recorded a death and a winner
- **THEN** the live state returns to the pre-command clone with no death, winner or journal entry

### Requirement: Single owner for shared resolution writers

The engine's resolution modules SHALL own every writer for death, execution,
character change, effects and the winner, and one executable check SHALL list
those owners. A role, application, infrastructure, UI or entry module SHALL NOT
call such a writer or write the matching state record directly.

**Source**: `docs/adr/0002-engine-contracts.md` §1 and §3; [Issue #212](https://github.com/hose1021/grimoria/issues/212)
**Tests**: `src/core/roles/architecture.test.ts`, `src/core/engine/coordinator.test.ts`

#### Scenario: A role calls a shared writer

- **WHEN** a file under `src/core/roles` calls `kill`, `setWinner`, `replaceCharacter`, `swapCharacters` or `becomeDemon`
- **THEN** the ownership check fails and names the file and the writer

#### Scenario: A non-engine layer writes a shared record

- **WHEN** an application, infrastructure, UI or entry file mutates `state.effects`, `state.deaths`, `state.executions`, the current character or `state.winner`
- **THEN** the ownership check fails

#### Scenario: A new engine file bypasses the allowlist

- **WHEN** an engine file outside the recorded owner list calls a shared writer
- **THEN** the ownership check fails until the list is updated with a reviewed reason

### Requirement: Cross-role coordinator evidence

Each stage boundary SHALL have one cross-role acceptance test that names its
pinned source revision: protection before death and redirect, bypass versus
impairment, earlier protection versus the Fool, death versus transformation,
and transformation versus win. The suite SHALL use real engine fixtures and
assert state, records and winner reason codes, not source text.

**Source**: [Issue #212](https://github.com/hose1021/grimoria/issues/212); `docs/rules-matrix.md` rows for Monk r3124, Fool r2636, Assassin r1786, Fang Gu r2974, Mastermind r2993, Slayer r3122, Mayor r2995 and Pit-Hag r2998
**Tests**: `src/core/engine/coordinator.test.ts`

#### Scenario: Every boundary has a named test

- **WHEN** the coordinator suite runs
- **THEN** its manifest lists all five boundaries, and a missing boundary or a missing source revision fails the suite

#### Scenario: A boundary test asserts game state

- **WHEN** a boundary test passes
- **THEN** it asserted the death or execution record, the effect or character change, and the winner reason code as applicable for that boundary

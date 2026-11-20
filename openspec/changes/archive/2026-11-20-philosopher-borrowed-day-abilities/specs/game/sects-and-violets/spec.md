# Spec Delta

## MODIFIED Requirements

### Requirement: Philosopher borrowed ability

The engine SHALL store the good character the Philosopher chooses, SHALL make
the owner of that character drunk while it is in play, SHALL give the
Philosopher that character's night step on the same and later nights, including
each death-triggered ability the borrowed character has after the Philosopher
dies, and SHALL use the borrowed ability in place of the printed character for
that character's day ability. A Drunk's shown character SHALL NOT trigger a
hidden consequence.

**Source**: [Philosopher r2421](https://wiki.bloodontheclocktower.com/index.php?title=Philosopher&oldid=2421), [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165)
**Tests**: `src/core/engine/snv.test.ts`, `src/core/roles/moonchild/role.test.ts`

#### Scenario: Character in play

- **WHEN** the Philosopher chooses a good character another player holds
- **THEN** that player is drunk and the Philosopher wakes with the borrowed
  ability

#### Scenario: Character enters play later

- **WHEN** the chosen character is not in play at the choice and enters play
  later
- **THEN** its new owner becomes drunk at that moment

#### Scenario: Borrowed day ability

- **WHEN** the borrowed character has a day ability and the Philosopher uses it
- **THEN** the borrowed Slayer may shoot, the borrowed Tinker may die by the
  ability, and the borrowed Virgin triggers on a Townsfolk nomination

#### Scenario: Drunk shown a day ability

- **WHEN** a Drunk's shown character has a day ability
- **THEN** the Drunk may publicly attempt the Slayer shot with no death, and the
  shown Tinker, Virgin or Moonchild produces no hidden consequence or step

#### Scenario: Philosopher dies or is impaired

- **WHEN** the Philosopher dies or becomes impaired after granting the drunk
- **THEN** the owner is sober again

#### Scenario: Borrowed death-triggered ability

- **WHEN** the Philosopher borrowed the Klutz, the Sweetheart, the Sage or the
  Barber and the Philosopher dies in the way that triggers it
- **THEN** the borrowed ability wakes and resolves under the Philosopher's name

#### Scenario: Impaired Philosopher

- **WHEN** the Philosopher is poisoned or drunk when choosing
- **THEN** the once-per-game ability is spent and no ability or drunk effect is
  granted

#### Scenario: Declined ability

- **WHEN** the Philosopher completes the step without a character
- **THEN** the once-per-game ability is not spent

#### Scenario: Regained character

- **WHEN** a player who spent the ability later gains the Philosopher character
  again
- **THEN** the once-per-game ability is available again

# Spec Delta

## ADDED Requirements

### Requirement: The Courtier's character is drunk for three nights and three days

The engine SHALL, once per game, make every player with the chosen character
drunk from the Courtier step until the dusk three nights later, SHALL offer the
character choice to the Storyteller, and SHALL not build another Courtier step
after the ability is used.

**Source**: [Courtier r2968](https://wiki.bloodontheclocktower.com/index.php?title=Courtier&oldid=2968)
**Tests**: `js/bmr.test.mjs`

#### Scenario: The chosen character is drunk for the full window

- **WHEN** the Courtier chooses a character that is in play
- **THEN** each player with that character is impaired on the step night, on the third following day, and healthy from the fourth night

#### Scenario: The ability is once per game

- **WHEN** the Courtier has used the ability
- **THEN** no Courtier step appears on later nights

### Requirement: The Innkeeper protects both targets and makes one drunk

The engine SHALL protect both chosen players for the current night and SHALL
store a drunk effect on the chosen recipient until the next dusk. The
Storyteller SHALL choose the two players and which one is drunk.

**Source**: [Innkeeper r3160](https://wiki.bloodontheclocktower.com/index.php?title=Innkeeper&oldid=3160)
**Tests**: `js/bmr.test.mjs`

#### Scenario: Both targets are safe tonight

- **WHEN** the Innkeeper chooses two players and one drunk recipient
- **THEN** an ability that would kill either target tonight is prevented

#### Scenario: The drunk effect and protection end

- **WHEN** the next dusk arrives
- **THEN** the chosen recipient is no longer impaired and a later ability can kill either target

### Requirement: The Gambler dies only on a wrong guess while unimpaired

The engine SHALL kill the Gambler when the Storyteller records a wrong
character guess, SHALL leave the Gambler alive on a correct guess, and SHALL
apply no death while the Gambler is drunk or poisoned.

**Source**: [Gambler r3073](https://wiki.bloodontheclocktower.com/index.php?title=Gambler&oldid=3073)
**Tests**: `js/bmr.test.mjs`

#### Scenario: Wrong and correct guesses

- **WHEN** the Gambler guesses a character that does not match the chosen player
- **THEN** the Gambler dies
- **WHEN** the guess matches
- **THEN** the Gambler stays alive

#### Scenario: Impaired Gambler

- **WHEN** the Gambler is drunk or poisoned at the step
- **THEN** a wrong guess does not kill the Gambler

### Requirement: The Sailor's chosen recipient is drunk until dusk

The engine SHALL store a drunk effect on the player the Sailor chooses or on
the Sailor themself, SHALL expire that effect at the next dusk, and SHALL keep
the Sailor's death prevention while sober.

**Source**: [Sailor r1768](https://wiki.bloodontheclocktower.com/index.php?title=Sailor&oldid=1768)
**Tests**: `js/bmr.test.mjs`

#### Scenario: Another player is chosen

- **WHEN** the Sailor chooses another alive player as the drunk recipient
- **THEN** that player is impaired through the day and healthy from the next night

#### Scenario: The Sailor chooses themself

- **WHEN** the Sailor is the drunk recipient
- **THEN** the Sailor is impaired until the next dusk

### Requirement: The Shabaloth kills two players and may regurgitate

The engine SHALL offer two targets to the Shabaloth on other nights, SHALL
record both deaths through the outcome controls, SHALL store the last chosen
targets, and SHALL let the Storyteller resurrect one dead player from that last
choice.

**Source**: [Shabaloth r1790](https://wiki.bloodontheclocktower.com/index.php?title=Shabaloth&oldid=1790)
**Tests**: `js/bmr.test.mjs`

#### Scenario: Two kills

- **WHEN** the Shabaloth chooses two players and the host records both deaths
- **THEN** both players die and the choice is stored as the last targets

#### Scenario: Regurgitation

- **WHEN** the next night resolves and the host resurrects a dead player from the previous choice
- **THEN** that player is alive again

### Requirement: The Godfather learns the Outsiders and kills after an Outsider death

The engine SHALL show the living Outsiders in play on the first night, SHALL
build the other-night step only when an Outsider died today, and SHALL record
the chosen kill through the outcome controls.

**Source**: [Godfather r2394](https://wiki.bloodontheclocktower.com/index.php?title=Godfather&oldid=2394)
**Tests**: `js/bmr.test.mjs`

#### Scenario: First-night information

- **WHEN** the Godfather wakes on the first night
- **THEN** the step carries exactly the living Outsiders

#### Scenario: Outsider death enables the kill

- **WHEN** an Outsider died today and the next night starts
- **THEN** the Godfather step exists and the recorded target dies
- **WHEN** no Outsider died today
- **THEN** no Godfather step is built

### Requirement: The Moonchild's chosen good player dies the next night

The engine SHALL accept the Moonchild's public choice after death, SHALL queue
the next-night step with that choice, SHALL complete the step for the dead
actor, and SHALL kill the target only when it is good.

**Source**: [Moonchild r1783](https://wiki.bloodontheclocktower.com/index.php?title=Moonchild&oldid=1783)
**Tests**: `js/bmr.test.mjs`

#### Scenario: Good target

- **WHEN** the Moonchild died on day one and chose a living good player
- **THEN** the next night's Moonchild step carries that choice and kills the player

#### Scenario: Evil target

- **WHEN** the Moonchild chose an evil player
- **THEN** that player is still alive after the next-night step

### Requirement: The Professor resurrects only a dead Townsfolk, once per game

The engine SHALL resurrect a chosen dead player only when the real role is a
Townsfolk, SHALL apply the same check in the outcome controls, and SHALL not
build another Professor step after the ability is used.

**Source**: [Professor r1775](https://wiki.bloodontheclocktower.com/index.php?title=Professor&oldid=1775)
**Tests**: `js/bmr.test.mjs`

#### Scenario: Non-Townsfolk target

- **WHEN** the Professor chooses a dead Outsider
- **THEN** the player stays dead even if the outcome controls receive the same target

#### Scenario: Once per game

- **WHEN** the Professor has used the ability
- **THEN** no Professor step appears on later nights

### Requirement: The Fool's first death is prevented

The engine SHALL prevent the Fool's first death from any cause, SHALL spend the
ability on that prevention, SHALL allow a later death to kill the Fool, and
SHALL keep the Assassin's bypass.

**Source**: [Fool r2636](https://wiki.bloodontheclocktower.com/index.php?title=Fool&oldid=2636)
**Tests**: `js/bmr.test.mjs`

#### Scenario: First death and second death

- **WHEN** the Fool would die for the first time
- **THEN** the death does not happen and the ability is spent
- **WHEN** the Fool would die again
- **THEN** the Fool dies

#### Scenario: First execution

- **WHEN** the Fool is executed for the first time
- **THEN** the execution does not kill the Fool

#### Scenario: Assassin bypass

- **WHEN** the Assassin chooses the Fool
- **THEN** the Fool dies and the ability is not spent

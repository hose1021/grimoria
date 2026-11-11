# Spec Delta

## MODIFIED Requirements

### Requirement: Exact player-count composition

The setup SHALL produce the official team composition for every count from 5 to
15 players, SHALL keep the team total equal to the player count with exactly one
Demon, and SHALL apply the Baron's shift of two Townsfolk to two Outsiders.

**Source**: [Setup r1361](https://wiki.bloodontheclocktower.com/index.php?title=Setup&oldid=1361), [Baron r2961](https://wiki.bloodontheclocktower.com/index.php?title=Baron&oldid=2961)
**Tests**: `js/setup.test.mjs`, `js/engine.test.mjs:102`, `js/presets.test.mjs:146`

#### Scenario: Seven players

- **WHEN** the host selects 7 players on a Trouble Brewing game
- **THEN** the bag contains 5 Townsfolk, 0 Outsiders, 1 Minion and 1 Demon

#### Scenario: Every supported count

- **WHEN** the host builds a bag at any count from 5 to 15
- **THEN** the composition table returns a row, its teams sum to the count, and exactly one team is the Demon

#### Scenario: Baron at five players

- **WHEN** the bag contains the Baron at 5 players
- **THEN** the bag contains 1 Townsfolk, 2 Outsiders, 1 Minion and 1 Demon

### Requirement: Scenario setup modifiers

The setup SHALL apply the Baron's plus two Outsiders, the Godfather's plus or
minus one Outsider, the Fang Gu's plus one Outsider and the Vigormortis's minus
one Outsider, SHALL keep the bag the same size as the player count, and SHALL
reject a modifier that cannot be satisfied with a reason.

**Source**: [Baron r2961](https://wiki.bloodontheclocktower.com/index.php?title=Baron&oldid=2961), [Godfather r2394](https://wiki.bloodontheclocktower.com/index.php?title=Godfather&oldid=2394), [Fang Gu r2974](https://wiki.bloodontheclocktower.com/index.php?title=Fang_Gu&oldid=2974), [Vigormortis r3015](https://wiki.bloodontheclocktower.com/index.php?title=Vigormortis&oldid=3015)
**Tests**: `js/setup.test.mjs`, `js/bmr.test.mjs:114`, `js/snv.test.mjs:86`

#### Scenario: Each modifier shifts the composition

- **WHEN** the bag contains the Baron, the Godfather, the Fang Gu or the Vigormortis
- **THEN** the composition gains two Outsiders, gains or loses one, gains one, or loses one respectively, and the team total still equals the player count

#### Scenario: Impossible Godfather shift

- **WHEN** the host sets the Godfather to minus one Outsider and the base composition has no Outsider
- **THEN** bag validation reports `godfather-minus` and a reason

#### Scenario: Vigormortis shift

- **WHEN** the Vigormortis is in play
- **THEN** the bag removes one Outsider and rejects a negative Outsider count

#### Scenario: Impossible Vigormortis shift

- **WHEN** the Vigormortis is in play at a count with no base Outsider
- **THEN** bag validation reports `vigormortis-minus` and the bag removes no Outsider

### Requirement: Legal bag validation

Bag validation SHALL reject duplicate roles, a wrong total, roles outside the
selected script, a bluff that is in play, a Drunk shown role that leaks the
mask, and a Lunatic shown role that is missing, not a Demon or outside the
selected script, each with a stable reason code; a randomly generated bag SHALL
be legal at every supported player count.

**Source**: [Setup r1361](https://wiki.bloodontheclocktower.com/index.php?title=Setup&oldid=1361), [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165), [Lunatic r3112](https://wiki.bloodontheclocktower.com/index.php?title=Lunatic&oldid=3112), `docs/rules-sources.md` "Setup and composition"
**Tests**: `js/setup.test.mjs`, `js/engine.test.mjs:120`, `js/engine.test.mjs:144`, `js/bmr.test.mjs:103`, `js/snv.test.mjs:78`

#### Scenario: Duplicate role

- **WHEN** a five-player bag lists the Chef twice
- **THEN** bag validation fails with the duplicate reason

#### Scenario: Bluff that is in play

- **WHEN** a bluff role is also in the bag
- **THEN** bag validation fails with the in-play reason

#### Scenario: Lunatic without a shown Demon

- **WHEN** the bag contains the Lunatic and no shown Demon is selected
- **THEN** bag validation reports `lunatic-shown`

#### Scenario: Lunatic mask of the wrong team or script

- **WHEN** the shown Lunatic role is not a Demon or is outside the selected script
- **THEN** bag validation reports `lunatic-team` or `lunatic-outside-script`

### Requirement: Bluffs and secret masks

The setup SHALL offer three distinct good roles not in play as Demon bluffs at
seven or more players, SHALL offer none at five or six players, SHALL keep the
Drunk and Lunatic shown roles out of the bluff pool, and SHALL keep those masks
out of the public projection.

**Source**: [Setup r1361](https://wiki.bloodontheclocktower.com/index.php?title=Setup&oldid=1361), [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165), [Lunatic r3112](https://wiki.bloodontheclocktower.com/index.php?title=Lunatic&oldid=3112)
**Tests**: `js/setup.test.mjs`, `js/engine.test.mjs:175`, `js/presets.test.mjs:53`, `js/presets.test.mjs:138`

#### Scenario: Five-player game

- **WHEN** the game has 5 players
- **THEN** the setup offers no bluffs and no evil-team introduction

#### Scenario: Drunk mask exclusion

- **WHEN** the bag contains a Drunk whose shown role is the Washerwoman
- **THEN** the Washerwoman cannot be a Demon bluff and the validator reports `bluffs-drunk`

#### Scenario: Lunatic mask exclusion

- **WHEN** the Lunatic's shown Demon is offered as a Demon bluff
- **THEN** the validator reports `bluffs-lunatic` and the bluff is rejected

#### Scenario: Public projection

- **WHEN** the public view is rendered for a game with a Drunk or a Lunatic
- **THEN** it contains neither real role, the shown mask, nor the bluffs

## ADDED Requirements

### Requirement: Script-scoped setup

The setup SHALL deal only from one of the three official fixed rosters or a
single-edition custom script, SHALL reject a role outside the selected script,
and SHALL reject a mixed-edition pool unless explicit manual-only mode is set.

**Source**: `SPEC.md` "Scenarios"; `docs/rules-sources.md` "Known limitations"
**Tests**: `js/setup.test.mjs`, `js/scripts.test.mjs`, `js/manual.test.mjs`

#### Scenario: Role outside the script

- **WHEN** the bag lists a role the selected script does not contain
- **THEN** bag validation reports `outside-script` and names the role

#### Scenario: Mixed pool without manual mode

- **WHEN** a mixed-edition pool is validated without manual-only mode
- **THEN** setup validation reports `mixed-edition`

#### Scenario: Script import limits

- **WHEN** an imported script has an unknown role, no Demon or fewer than five roles
- **THEN** the import fails and the error names the limit

# Spec Delta

## ADDED Requirements

### Requirement: The Devil's Advocate cannot repeat the previous target

The engine SHALL reject a Devil's Advocate choice that repeats the target of
the actor's last completed Devil's Advocate step. A rejected choice SHALL leave
the step incomplete and the game state unchanged.

**Source**: [Devil's Advocate r2594](https://wiki.bloodontheclocktower.com/index.php?title=Devil%27s_Advocate&oldid=2594)
**Tests**: `js/bmr.test.mjs`

#### Scenario: Repeat target on the next night

- **WHEN** the Devil's Advocate chose player A on night N and the host chooses A again on night N+1
- **THEN** the command is rejected with `error.50`, the step stays incomplete, no effect is added, and A is unchanged

#### Scenario: Different target on the next night

- **WHEN** the Devil's Advocate chose A on night N and the host chooses B on night N+1
- **THEN** the command is allowed and the execution protection targets B

#### Scenario: First night has no restriction

- **WHEN** the Devil's Advocate acts for the first time in the game
- **THEN** any legal target is allowed and the chosen target is stored for the next night

### Requirement: The Exorcist cannot repeat the previous target

The engine SHALL reject an Exorcist choice that repeats the target of the
actor's last completed Exorcist step, using the same rejection contract.

**Source**: [Exorcist r2973](https://wiki.bloodontheclocktower.com/index.php?title=Exorcist&oldid=2973)
**Tests**: `js/bmr.test.mjs`

#### Scenario: Repeat target on the next night

- **WHEN** the Exorcist chose player A on night N and the host chooses A again on night N+1
- **THEN** the command is rejected with `error.50` and no Demon wake is skipped

#### Scenario: Different target on the next night

- **WHEN** the Exorcist chose A on night N and the host chooses B on night N+1
- **THEN** the command is allowed, B is recorded as the previous target, and the normal Exorcist outcome resolves

#### Scenario: A new Exorcist has no previous target

- **WHEN** a player becomes the Exorcist after the original Exorcist left play
- **THEN** the new actor may choose any legal target on its first step

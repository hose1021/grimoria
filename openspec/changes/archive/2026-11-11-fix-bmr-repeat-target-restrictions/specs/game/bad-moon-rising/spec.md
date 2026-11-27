# Spec Delta

## ADDED Requirements

### Requirement: The Devil's Advocate cannot repeat the previous target

The engine SHALL reject a Devil's Advocate choice that repeats the target the
actor chose on the immediately preceding night. A rejected choice SHALL leave
the step incomplete and the game state unchanged.

**Source**: [Devil's Advocate r2594](https://wiki.bloodontheclocktower.com/index.php?title=Devil%27s_Advocate&oldid=2594) ("different to last night"; "cannot choose the same player two nights in a row")
**Tests**: `js/bmr.test.mjs`

#### Scenario: Repeat target on the next night

- **WHEN** the Devil's Advocate chose player A on night N and the host chooses A again on night N+1
- **THEN** the command is rejected with `error.50`, the step stays incomplete, no effect is added, and A is unchanged

#### Scenario: Different target on the next night

- **WHEN** the Devil's Advocate chose A on night N and the host chooses B on night N+1
- **THEN** the command is allowed and the execution protection targets B

#### Scenario: First night has no restriction

- **WHEN** the Devil's Advocate acts for the first time in the game
- **THEN** any legal target is allowed and the chosen target and night are stored for the next night

### Requirement: The Exorcist cannot repeat the previous target

The engine SHALL reject an Exorcist choice that repeats the target the actor
chose on the immediately preceding night, using the same rejection contract.

**Source**: [Exorcist r2973](https://wiki.bloodontheclocktower.com/index.php?title=Exorcist&oldid=2973) ("different to last night"; "may not choose the same player two nights in a row")
**Tests**: `js/bmr.test.mjs`

#### Scenario: Repeat target on the next night

- **WHEN** the Exorcist chose player A on night N and the host chooses A again on night N+1
- **THEN** the command is rejected with `error.50` and no Demon wake is skipped

#### Scenario: Different target on the next night

- **WHEN** the Exorcist chose A on night N and the host chooses B on night N+1
- **THEN** the command is allowed, B is recorded with its night, and the normal Exorcist outcome resolves

#### Scenario: A new Exorcist has no previous target

- **WHEN** a player becomes the Exorcist after the original Exorcist left play
- **THEN** the new actor may choose any legal target on its first step

### Requirement: A night without a choice breaks the consecutive pair

The engine SHALL apply the Devil's Advocate and Exorcist target restriction only
when the actor chose the target on the immediately preceding night. If the actor
made no choice on that night, the engine SHALL allow any legal target,
including the target chosen before the gap.

**Source**: [Devil's Advocate r2594](https://wiki.bloodontheclocktower.com/index.php?title=Devil%27s_Advocate&oldid=2594), [Exorcist r2973](https://wiki.bloodontheclocktower.com/index.php?title=Exorcist&oldid=2973); owner request in #35 follow-up
**Tests**: `js/bmr.test.mjs`

#### Scenario: Host skips the step

- **WHEN** the actor chose A on night N, the host skips the step on night N+1, and the actor tries A on night N+2
- **THEN** the choice is allowed because N+1 and N+2 are not a pair of consecutive choices

#### Scenario: The actor was dead and is resurrected

- **WHEN** the actor chose A, died before the next night, made no choice while dead, and is alive again on night N+2
- **THEN** A is a legal target

#### Scenario: The actor left the role and returned

- **WHEN** the actor chose A, stopped being the role for night N+1, and became the role again on night N+2
- **THEN** the old record does not restrict A

#### Scenario: Legacy save without a night

- **WHEN** an imported save has a used-target record but no night number
- **THEN** the engine treats the record as unknown, allows any legal target, and writes a complete record after the next choice

#### Scenario: Consecutive choices are still rejected

- **WHEN** the actor chose A on night N and tries A again on night N+1
- **THEN** the engine rejects the second choice even if the first choice had no effect because the actor was impaired

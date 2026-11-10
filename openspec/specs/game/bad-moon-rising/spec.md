# Bad Moon Rising Specification

## Purpose

Defines the Bad Moon Rising behaviors the engine owns while the Storyteller
adjudicates printed abilities: official order, setup choices, protection order,
death recording, conditional wakes and the Mastermind extra day.

## Requirements

### Requirement: Official order and setup

The engine SHALL use the official Bad Moon Rising roster, composition and night
order, SHALL apply the Godfather's plus-or-minus one Outsider setting and SHALL
store the Lunatic's shown Demon.

**Source**: [Bad Moon Rising r2871](https://wiki.bloodontheclocktower.com/index.php?title=Bad_Moon_Rising&oldid=2871), [Godfather r2394](https://wiki.bloodontheclocktower.com/index.php?title=Godfather&oldid=2394), [Lunatic r3112](https://wiki.bloodontheclocktower.com/index.php?title=Lunatic&oldid=3112)
**Tests**: `js/bmr.test.mjs:82`, `js/bmr.test.mjs:114`, `js/bmr.test.mjs:128`

#### Scenario: Roster and order

- **WHEN** a Bad Moon Rising game starts
- **THEN** the roster has 25 roles and the first night follows the official order

#### Scenario: Lunatic mask

- **WHEN** the Lunatic is in play
- **THEN** the setup stores a shown Demon and the real Demon learns the Lunatic

### Requirement: Death prevention and bypass

The engine SHALL resolve protection deterministically: the Assassin bypasses
Fool, Sailor, Tea Lady, Innkeeper and Devil's Advocate protection; the Zombuul
replaces its first death and registers as dead while sober; an impaired
Zombuul dies normally.

**Source**: [Assassin r1786](https://wiki.bloodontheclocktower.com/index.php?title=Assassin&oldid=1786), [Fool r2636](https://wiki.bloodontheclocktower.com/index.php?title=Fool&oldid=2636), [Zombuul r3022](https://wiki.bloodontheclocktower.com/index.php?title=Zombuul&oldid=3022)
**Tests**: `js/bmr.test.mjs:175`, `js/bmr.test.mjs:190`, `js/bmr.test.mjs:394`, `js/bmr.test.mjs:406`

#### Scenario: Assassin against the Fool

- **WHEN** the Assassin chooses the Fool
- **THEN** the Fool dies

#### Scenario: Impaired Zombuul

- **WHEN** a poisoned Zombuul dies for the first time
- **THEN** it dies and does not register as dead

### Requirement: Target ranges and conditional wakes

The engine SHALL enforce each step's target range, SHALL let the Po choose three
targets only after a night with no choice, SHALL skip a chosen Demon's wake for
the Exorcist, and SHALL resurrect only a dead Townsfolk for the Professor.

**Source**: [Po r3104](https://wiki.bloodontheclocktower.com/index.php?title=Po&oldid=3104), [Exorcist r2973](https://wiki.bloodontheclocktower.com/index.php?title=Exorcist&oldid=2973), [Professor r1775](https://wiki.bloodontheclocktower.com/index.php?title=Professor&oldid=1775)
**Tests**: `js/bmr.test.mjs:142`, `js/bmr.test.mjs:155`, `js/bmr.test.mjs:237`, `js/bmr.test.mjs:298`

#### Scenario: Po after an empty night

- **WHEN** the Po chose no target on the previous night
- **THEN** the next Po step requires exactly three targets

#### Scenario: Exorcist target

- **WHEN** the Exorcist chooses the Demon
- **THEN** the Demon does not wake that night

### Requirement: Conditional information and day triggers

The engine SHALL schedule the Gossip kill only after a true statement, SHALL
accept the Moonchild's choice only from a living player, SHALL kill the
Grandmother when the Demon kills the grandchild, SHALL make everyone except the
Minstrel drunk after a Minion execution, and SHALL extend the game by one day
after a Demon execution when the Mastermind is in play.

**Source**: [Gossip r1773](https://wiki.bloodontheclocktower.com/index.php?title=Gossip&oldid=1773), [Moonchild r1783](https://wiki.bloodontheclocktower.com/index.php?title=Moonchild&oldid=1783), [Grandmother r2978](https://wiki.bloodontheclocktower.com/index.php?title=Grandmother&oldid=2978), [Minstrel r2600](https://wiki.bloodontheclocktower.com/index.php?title=Minstrel&oldid=2600), [Mastermind r2993](https://wiki.bloodontheclocktower.com/index.php?title=Mastermind&oldid=2993)
**Tests**: `js/bmr.test.mjs:224`, `js/bmr.test.mjs:268`, `js/bmr.test.mjs:285`, `js/bmr.test.mjs:312`, `js/bmr.test.mjs:205`

#### Scenario: Gossip statement

- **WHEN** the host records the Gossip statement as true
- **THEN** the next night queues one death step

#### Scenario: Mastermind extra day

- **WHEN** the Demon dies by execution with the Mastermind in play
- **THEN** the game continues for one more day

### Requirement: Tea Lady neighbours

The engine SHALL protect the nearest living neighbours while both are good,
SHALL skip dead seats, and SHALL not protect when a living neighbour is evil.

**Source**: [Tea Lady r1777](https://wiki.bloodontheclocktower.com/index.php?title=Tea_Lady&oldid=1777)
**Tests**: `js/bmr.test.mjs:341`, `js/bmr.test.mjs:353`, `js/bmr.test.mjs:365`

#### Scenario: Dead seat between neighbours

- **WHEN** a seat between the Tea Lady and a good player is dead
- **THEN** the nearest living neighbour is protected

### Requirement: Sailor safety

The engine SHALL prevent the Sailor's death while sober and healthy and SHALL
allow it while poisoned or drunk.

**Source**: [Sailor r1768](https://wiki.bloodontheclocktower.com/index.php?title=Sailor&oldid=1768)
**Tests**: `js/bmr.test.mjs:375`

#### Scenario: Impaired Sailor

- **WHEN** the Sailor is drunk when attacked
- **THEN** the Sailor dies

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

### Requirement: Pukka self-target suspends the previous victim

When a healthy Pukka chooses itself, the engine SHALL poison the Pukka, SHALL make the previously poisoned player healthy, SHALL suspend that player's pending death, and SHALL record no death on that step.

**Source**: [Pukka × Pukka interaction](https://botc.me/interaction/pukka/pukka) (community compendium, updated 2025-11-30); [Pukka r3074](https://wiki.bloodontheclocktower.com/index.php?title=Pukka&oldid=3074); owner decision on PR #24
**Tests**: `js/bmr.test.mjs`

#### Scenario: Self-target after a normal poison

- **WHEN** night N poisons player A and the healthy Pukka chooses itself on night N+1
- **THEN** A is alive and no longer poisoned, the Pukka is poisoned, A keeps one suspended `pukka-death` effect, and no death is recorded that night

#### Scenario: The new poison is applied before the old death is considered

- **WHEN** the self-target resolves after the Pukka was healthy at the start of the step
- **THEN** the self-poison is stored before the engine decides that the previous death stays suspended

### Requirement: A self-poisoned Pukka applies no new poison or death

While the Pukka is impaired by its own poison, the engine SHALL apply no new poison, SHALL resolve no pending Pukka death, and SHALL keep the Pukka and its suspended victim in their current states.

**Source**: [Pukka r3074](https://wiki.bloodontheclocktower.com/index.php?title=Pukka&oldid=3074); [Pukka × Pukka interaction](https://botc.me/interaction/pukka/pukka); owner decision on PR #24
**Tests**: `js/bmr.test.mjs`

#### Scenario: Impaired Pukka on the next night

- **WHEN** the self-poisoned Pukka reaches its next step
- **THEN** no chosen player is poisoned, no suspended death resolves, and the Pukka remains poisoned

#### Scenario: No incorrect delayed death on later nights

- **WHEN** several nights pass without the Pukka becoming healthy
- **THEN** neither the previous victim nor the Pukka dies from the suspended effects

### Requirement: A suspended self-target death resumes when the Pukka becomes healthy

The engine SHALL resolve a death suspended by Pukka self-target as soon as the Pukka becomes healthy, using the normal Pukka death and protection rules.

**Source**: [Pukka × Pukka interaction](https://botc.me/interaction/pukka/pukka); owner decision on PR #24
**Tests**: `js/bmr.test.mjs`

#### Scenario: Self-poison is removed

- **WHEN** the Pukka's self-poison becomes inactive before the next Pukka step
- **THEN** the previous victim dies in the same command, normal protection can prevent the death, and that victim's Pukka effects clear

#### Scenario: Game over after the resumed death

- **WHEN** the resumed death satisfies a win condition
- **THEN** the engine records the winner with the same win check as a normal Pukka death, and preview reports the same winner

### Requirement: A healthy Pukka dies as the previously poisoned target

After a self-target, when the Pukka becomes healthy and makes another choice, the engine SHALL poison the new target first and SHALL then resolve the Pukka's own suspended death.

**Source**: [Pukka × Pukka interaction](https://botc.me/interaction/pukka/pukka); owner decision on PR #24
**Tests**: `js/bmr.test.mjs`

#### Scenario: Healthy Pukka chooses again

- **WHEN** the Pukka is healthy at a later step and chooses player B
- **THEN** B is poisoned, the Pukka dies as the previously poisoned target, and any win condition is evaluated after both deaths

#### Scenario: Self-target preview matches apply

- **WHEN** a self-target command is previewed and then applied from the same state
- **THEN** preview and apply report the same effects, suspended deaths and future, and preview does not mutate the state

### Requirement: Pukka poison suspends under mixed impairment

While the Pukka is impaired by any other poison or drunk effect, the engine SHALL keep the Pukka's active poison and its pending death suspended. The engine SHALL resume both only when the Pukka is no longer impaired.

**Source**: [Pukka r3074](https://wiki.bloodontheclocktower.com/index.php?title=Pukka&oldid=3074); [Abilities](https://wiki.bloodontheclocktower.com/Abilities); owner decision on PR #24
**Tests**: `js/bmr.test.mjs`, `js/commands.test.mjs`

#### Scenario: Later poison on the Pukka

- **WHEN** the Pukka poisons A on night 1 and another poison targets the Pukka on night 2
- **THEN** A is no longer poisoned and A's pending death is suspended, and both resume when the Pukka becomes healthy

#### Scenario: Self-poison removed but drunk remains

- **WHEN** the Pukka's self-poison is removed while a drunk effect still targets the Pukka
- **THEN** the suspended death stays suspended and the Pukka's poison stays inactive

#### Scenario: All impairments cleared

- **WHEN** the Pukka is no longer targeted by any poison or drunk effect
- **THEN** the suspended death resolves immediately and the Pukka's poison is active again

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
record both deaths through the outcome controls, SHALL store the chosen targets
with their night, and SHALL let the Storyteller resurrect one dead player from
that last choice only on the immediately following night.

**Source**: [Shabaloth r1790](https://wiki.bloodontheclocktower.com/index.php?title=Shabaloth&oldid=1790)
**Tests**: `js/bmr.test.mjs`

#### Scenario: Two kills

- **WHEN** the Shabaloth chooses two players and the host records both deaths
- **THEN** both players die and the choice is stored as the last targets

#### Scenario: Regurgitation

- **WHEN** the next night resolves and the host resurrects a dead player from the previous choice
- **THEN** that player is alive again

#### Scenario: Only the previous choice

- **WHEN** the host tries to resurrect a dead player who was not one of the previous night's targets
- **THEN** the command is rejected with `error.51` and the player stays dead

#### Scenario: A recorded death outside the choice

- **WHEN** the host recorded another death during the Shabaloth step but did not choose that player
- **THEN** that player cannot be regurgitated on the next night

#### Scenario: Skipped night

- **WHEN** the Shabaloth chose targets on night N, made no choice on night N+1, and the host tries to resurrect one of them on night N+2
- **THEN** the command is rejected with `error.51` because only the immediately preceding night counts

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

#### Scenario: The recorded choice is authoritative

- **WHEN** the completion names no target
- **THEN** the engine kills the player recorded on the step
- **WHEN** the completion names a different player
- **THEN** the command is rejected with `error.51` and the state is unchanged

### Requirement: The Professor resurrects only a dead Townsfolk, once per game

The engine SHALL resurrect a chosen dead player only when the real role is a
Townsfolk, SHALL apply the same check in the outcome controls, and SHALL not
build another Professor step after the ability is used.

**Source**: [Professor r1775](https://wiki.bloodontheclocktower.com/index.php?title=Professor&oldid=1775)
**Tests**: `js/bmr.test.mjs`

#### Scenario: Non-Townsfolk target

- **WHEN** the Professor chooses a dead Outsider
- **THEN** the player stays dead even if the outcome controls receive the same target

#### Scenario: Impaired Professor

- **WHEN** the Professor is drunk or poisoned at the step
- **THEN** the choose step and the outcome controls resurrect nobody

#### Scenario: Second resurrection in the same use

- **WHEN** the Professor already resurrected the chosen target and the outcome controls name a different dead player
- **THEN** the command is rejected with `error.51` and that player stays dead

#### Scenario: Outcome without the chosen target

- **WHEN** the outcome controls are used before the step completes, or name a player other than the chosen target
- **THEN** the command is rejected with `error.51`

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

### Requirement: The Goon drinks its first chooser and takes their alignment

The engine SHALL make the first player to choose the Goon each night drunk
before their ability resolves, SHALL prevent that ability from applying an
effect, SHALL keep the drunk until the next dusk, and SHALL set the Goon's
alignment to that player's alignment. A chooser that puts a poison or drunk on
the Goon SHALL leave the effect graph acyclic. When the Assassin chooses the
Goon, the Goon SHALL die and still turn evil; the Moonchild's stored choice
SHALL still resolve.

**Source**: [Goon r2977](https://wiki.bloodontheclocktower.com/index.php?title=Goon&oldid=2977)
**Tests**: `js/bmr.test.mjs`

#### Scenario: First chooser

- **WHEN** a player chooses the healthy Goon with their ability and no earlier player chose them that night
- **THEN** that player is drunk immediately, their ability does not work, the Goon takes their alignment, and no later chooser in the same night changes either result

#### Scenario: Until dusk

- **WHEN** the next dusk arrives
- **THEN** the granted drunk has expired

#### Scenario: Impaired Goon

- **WHEN** the Goon is drunk or poisoned when chosen
- **THEN** the chooser is not drunk and the Goon's alignment does not change

#### Scenario: Already impaired chooser

- **WHEN** the chooser was already drunk or poisoned when they chose the Goon
- **THEN** the Goon still changes alignment and the chooser is still drunk

#### Scenario: Not an ability choice

- **WHEN** the Lunatic's simulated choice or the Grandmother's Storyteller pick targets the Goon
- **THEN** the Goon grants nothing

#### Scenario: A chooser that impairs the Goon

- **WHEN** a Pukka, Sailor or Innkeeper chooses the Goon
- **THEN** the command is accepted, the effect graph stays acyclic and the chooser's own poison, drunk or protection does not apply

#### Scenario: Impaired outcome

- **WHEN** the Goon-impaired step's outcome is recorded
- **THEN** no death or resurrection is applied

#### Scenario: Assassin exception

- **WHEN** the Assassin chooses the Goon
- **THEN** the Goon dies, still turns evil, and the Assassin outcome is not rejected

#### Scenario: Moonchild bookkeeping

- **WHEN** a dead Moonchild's stored choice targets the Goon
- **THEN** the Goon still dies

### Requirement: The Lunatic wears a Demon mask and the real Demon learns its choice

The engine SHALL store the shown Demon for the Lunatic without making the
player evil, SHALL name the Lunatic in the night-one Demon information when a
Demon information step exists, SHALL report the Lunatic's name and last choice
on every Demon role step while the Lunatic is in play, and SHALL record the
Lunatic's choice without causing a death.

**Source**: [Lunatic r3112](https://wiki.bloodontheclocktower.com/index.php?title=Lunatic&oldid=3112)
**Tests**: `js/bmr.test.mjs`

#### Scenario: Mask

- **WHEN** the Lunatic is in play
- **THEN** the player's shown role is the stored Demon and the player's alignment stays good

#### Scenario: Demon report

- **WHEN** a Demon role step wakes while a Lunatic is in play
- **THEN** the step information names the Lunatic and the player they chose that night

#### Scenario: No death

- **WHEN** the Lunatic chooses a player
- **THEN** the choice is stored and no one dies

### Requirement: The Mastermind extra day decides by the executed team

The engine SHALL end the Mastermind's extra day by the real alignment of the
executed player: a good player executed on that day loses for good, and an evil
player executed there loses for evil.

**Source**: [Mastermind r2993](https://wiki.bloodontheclocktower.com/index.php?title=Mastermind&oldid=2993)
**Tests**: `js/bmr.test.mjs`

#### Scenario: Good player executed

- **WHEN** a good player is executed on the Mastermind's extra day
- **THEN** evil wins with the `mastermind` reason

#### Scenario: Evil player executed

- **WHEN** an evil player is executed on the Mastermind's extra day
- **THEN** good wins with the `mastermind` reason

### Requirement: The audited roles expose a support status

The engine SHALL expose, for every audited Bad Moon Rising role in play, its
support status (`verified`, `host-choice` or `unsupported`) together with the
detail used by the Storyteller screens; a role outside the audit SHALL NOT be
listed.

**Source**: [Issue #37](https://github.com/hose1021/grimoria/issues/37), `docs/rules-matrix.md` "Status legend"
**Tests**: `js/bmr.test.mjs`

#### Scenario: Audited roles

- **WHEN** the audited roles are in play
- **THEN** the Goon, Lunatic and Mastermind report `verified`, the Tinker and Pacifist report `host-choice`, and each entry names its detail

#### Scenario: Unaudited role

- **WHEN** a role outside the audited set is in play
- **THEN** the support list omits it

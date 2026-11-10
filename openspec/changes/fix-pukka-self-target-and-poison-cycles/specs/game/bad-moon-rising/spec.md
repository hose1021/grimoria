# Spec Delta

## ADDED Requirements

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

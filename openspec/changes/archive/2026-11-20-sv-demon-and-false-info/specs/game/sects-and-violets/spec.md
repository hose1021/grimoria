# Spec Delta

## ADDED Requirements

### Requirement: An impaired Sects and Violets Demon kills nobody

The S&V outcome path SHALL reject every recorded death when the acting Demon is
drunk or poisoned. The state SHALL stay unchanged.

**Source**: [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039) "Drunk and poisoned"; Issue #219
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: A drunk Demon records a death

- **WHEN** an impaired Fang Gu step records a death
- **THEN** the outcome is rejected with `error.52` and the target stays alive

### Requirement: The Fang Gu jumps only on a death

The Fang Gu jump SHALL require a living Outsider target. An Outsider chosen
while already dead SHALL not change and the Fang Gu SHALL not die.

**Source**: [Fang Gu r2974](https://wiki.bloodontheclocktower.com/index.php?title=Fang_Gu&oldid=2974) "Summary"; Issue #219
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: The chosen Outsider is already dead

- **WHEN** the Fang Gu chooses a dead Outsider
- **THEN** the step completes without a jump and the Fang Gu stays alive

### Requirement: Impairment alone keeps the true answer legal

A drunk or poisoned Townsfolk information step SHALL offer the true value among
its legal answers. Only a living, unimpaired Vortox SHALL remove it.

**Source**: [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039) "You can give them false information"; [Vortox r3017](https://wiki.bloodontheclocktower.com/index.php?title=Vortox&oldid=3017); Issue #219
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: An impaired Clockmaker

- **WHEN** the Clockmaker is drunk or poisoned and no Vortox is in play
- **THEN** the true distance is one of the offered answers

#### Scenario: A living Vortox

- **WHEN** a living, unimpaired Vortox is in play
- **THEN** the true value is not offered

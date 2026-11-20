# Spec Delta

## ADDED Requirements

### Requirement: The Barber swap follows the Barber's own sober death

The Barber step SHALL be appended only when the recent death record names the
Barber as the role at death and records that death as sober. A player who died
before becoming the Barber, or who died drunk or poisoned, SHALL get no swap.

**Source**: [Barber r1757](https://wiki.bloodontheclocktower.com/index.php?title=Barber&oldid=1757) "Summary"; [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); Issue #219
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Death before the character change

- **WHEN** a player dies and later becomes the Barber
- **THEN** no Barber step is appended for that player

#### Scenario: A drunk Barber dies

- **WHEN** the Barber dies while drunk or poisoned
- **THEN** no Barber step is appended

#### Scenario: A sober Barber dies

- **WHEN** the Barber dies sober and healthy
- **THEN** the Demon may swap two characters, as before

## MODIFIED Requirements

### Requirement: Witch curse

The engine SHALL place a curse only when the Witch's ability works and SHALL
kill the cursed player on their next day's nomination only while that curse
is active, keeping the nomination. Death or impairment of the Witch SHALL
disable the curse unless the dead Witch retains its ability through an active
Vigormortis. Impairment SHALL disable even a retained ability. Temporary
impairment SHALL suspend rather than remove it,
so recovery during its duration restores it. With three or fewer living
players, a placed curse SHALL NOT kill.

**Source**: [Witch r2682](https://wiki.bloodontheclocktower.com/index.php?title=Witch&oldid=2682), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039), [Vigormortis r3015](https://wiki.bloodontheclocktower.com/index.php?title=Vigormortis&oldid=3015)
**Tests**: `src/core/engine/snv.test.ts` "official Witch curse stops while its source is dead, drunk or poisoned"; `src/core/engine/snv.test.ts` "official Witch curse resumes when the Witch becomes healthy before nomination"

#### Scenario: Cursed nomination

- **WHEN** the cursed player nominates while the Witch's curse is active
- **THEN** the nominator dies and the nomination continues

#### Scenario: Impaired Witch

- **WHEN** the Witch is dead or poisoned at her own night step
- **THEN** no curse is placed

#### Scenario: Witch dies or is impaired after casting

- **WHEN** the Witch placed a curse and then died without retained ability or became impaired
- **THEN** the cursed player's nomination does not kill them while that condition holds

#### Scenario: Three living players

- **WHEN** exactly three players live
- **THEN** the Witch has no ability and the curse no longer kills

#### Scenario: Recovery before nomination

- **WHEN** the Witch becomes healthy again before the cursed player's nomination and the curse has not expired
- **THEN** that nomination triggers the curse

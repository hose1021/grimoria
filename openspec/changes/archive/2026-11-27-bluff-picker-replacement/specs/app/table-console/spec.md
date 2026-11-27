# Spec Delta

## MODIFIED Requirements

### Requirement: Setup bluff and mask controls

The setup UI SHALL show only eligible Demon bluffs, SHALL show occupied good
characters in the separate Lunatic choices, and SHALL offer a shuffle action
for each list. When a bluff list already holds its required count, a click on an
eligible unselected character SHALL replace the oldest entry instead of being
ignored. The host SHALL be able to select a Lunatic mask explicitly or resume
following the real Demon. The Lunatic information card SHALL use its own bluff
list without automatically naming the real Demon.

**Source**: [Lunatic r3112](https://wiki.bloodontheclocktower.com/index.php?title=Lunatic&oldid=3112), [Glossary r3168](https://wiki.bloodontheclocktower.com/index.php?title=Glossary&oldid=3168) "Demon info"; issue #487
**Tests**: `scripts/browser-check.ts`, `src/ui/screens/bluff-selection.test.ts`

#### Scenario: Separate private card

- **WHEN** the host shows the Lunatic information card with an independent bluff list
- **THEN** it contains that list and chosen false Minions without the actual Demon's identity

#### Scenario: Phone controls

- **WHEN** the host edits bluffs, the mask or bubble votes at 390 pixel width
- **THEN** the controls remain usable without horizontal overflow

#### Scenario: A full bluff list accepts a new pick

- **WHEN** the Demon bluff list holds three bluffs and the host clicks an eligible unselected character in the picker
- **THEN** the oldest bluff leaves, the clicked character joins the list, the list still holds three, and every entry stays outside the bag

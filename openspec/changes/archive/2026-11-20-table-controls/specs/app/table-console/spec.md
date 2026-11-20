## ADDED Requirements

### Requirement: Player bubble voting controls

Opening a player's bubble during the day SHALL offer a numeric vote tally.
A dead or registered-dead player's sheet SHALL also offer a spent-vote
control. Saved tallies and token state SHALL be visible on the table and
survive reload; all mutations SHALL use commands.

**Source**: [Issue #200](https://github.com/hose1021/grimoria/issues/200), [Rules Explanation r1310](https://wiki.bloodontheclocktower.com/index.php?title=Rules_Explanation&oldid=1310)
**Tests**: `scripts/browser-check.ts`

#### Scenario: Bubble tally and token

- **WHEN** the host saves a tally or changes a dead-vote marker from a player sheet
- **THEN** the bubble reflects the result after closing the sheet and after reload

### Requirement: Setup bluff and mask controls

The setup UI SHALL show only eligible Demon bluffs, SHALL show occupied good
characters in the separate Lunatic choices, and SHALL offer a shuffle action
for each list. The host SHALL be able to select a Lunatic mask explicitly or
resume following the real Demon. The Lunatic information card SHALL use its
own bluff list without automatically naming the real Demon.

**Source**: [Lunatic r3112](https://wiki.bloodontheclocktower.com/index.php?title=Lunatic&oldid=3112)
**Tests**: `scripts/browser-check.ts`

#### Scenario: Separate private card

- **WHEN** the host shows the Lunatic information card with an independent bluff list
- **THEN** it contains that list and chosen false Minions without the actual Demon's identity

#### Scenario: Phone controls

- **WHEN** the host edits bluffs, the mask or bubble votes at 390 pixel width
- **THEN** the controls remain usable without horizontal overflow

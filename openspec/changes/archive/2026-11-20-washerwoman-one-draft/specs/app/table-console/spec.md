# Spec Delta

## ADDED Requirements

### Requirement: One draft for a false information answer

The step sheet, the private information card and the command SHALL read one
draft for a drunk or poisoned actor's answer: the selected character or value,
the two players and the Storyteller's wording. The card SHALL show the answer
the command sends, and after completion SHALL show the recorded answer, not the
engine's computation or a poisoning label. A target change or a completed step
SHALL clear the draft.

**Source**: [Washerwoman r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630); [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); [Issue #217](https://github.com/hose1021/grimoria/issues/217); `SPEC.md` "Screens" (`/table`)
**Tests**: `src/ui/screens/table/helpers.test.ts` "an impaired actor card shows the chosen answer and its wording", `src/ui/screens/table/helpers.test.ts` "applyGiven keeps the Storyteller's wording in the same answer", `scripts/browser-check.ts`

#### Scenario: Wording, role and players in one answer

- **WHEN** the host types a false wording, chooses a Townsfolk and chooses two players for a poisoned Washerwoman
- **THEN** the card previews that wording, character and pair, and the command sends the same values

#### Scenario: After confirmation

- **WHEN** the step is confirmed and the draft is cleared
- **THEN** the card and the journal read the recorded answer, not the engine's prepared one

#### Scenario: A new target

- **WHEN** the host changes a target on a step that takes targets
- **THEN** the answer draft and its wording are cleared

#### Scenario: Privacy

- **WHEN** a poisoned actor's card is shown before or after confirmation
- **THEN** it contains no computed answer and no poisoning label

### Requirement: A false one-of-two answer offers both players

A one-of-two answer that asks the host SHALL offer both players beside the
role, so the Storyteller can name a pair other than the prepared one. The pair
SHALL be part of the same draft as the role and the wording, and SHALL reach
the card, the command, the journal and the reloaded game.

**Source**: [Washerwoman r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630); [Issue #217](https://github.com/hose1021/grimoria/issues/217); `SPEC.md` "Screens" (`/table`)
**Tests**: `scripts/browser-check.ts`

#### Scenario: A chosen pair

- **WHEN** the host chooses a role and two players other than the prepared pair
- **THEN** the card previews that role and pair and the command records them

#### Scenario: After confirmation and reload

- **WHEN** the confirmed answer is read in the journal and after a reload
- **THEN** the journal names the chosen character and both players, and the saved step keeps the pair

#### Scenario: A healthy answer

- **WHEN** the Washerwoman is sober and healthy
- **THEN** the step offers no pair control and keeps the prepared pair

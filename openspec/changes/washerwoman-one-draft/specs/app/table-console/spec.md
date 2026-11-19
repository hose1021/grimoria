# Spec Delta

## ADDED Requirements

### Requirement: One draft for a false information answer

The step sheet, the private information card and the confirm command SHALL read
one draft for a drunk or poisoned actor's answer: the selected character or
value, the two players and the Storyteller's wording. The card SHALL show the
same answer the command sends. After the step completes the card SHALL read the
answer the engine recorded. A target change or a completed step SHALL clear the
draft. The card SHALL NOT show the engine's computed answer or state that the
actor is poisoned.

**Source**: [Washerwoman r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630); [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); [Issue #217](https://github.com/hose1021/grimoria/issues/217); `SPEC.md` "Screens" (`/table`)
**Tests**: `src/ui/screens/table/helpers.test.ts` "an impaired actor card shows the chosen answer and its wording", `src/ui/screens/table/helpers.test.ts` "applyGiven keeps the Storyteller's wording in the same answer", `scripts/browser-check.ts`

#### Scenario: Wording and role in one answer

- **WHEN** the host types a false wording and then chooses a Townsfolk for a poisoned Washerwoman
- **THEN** the card previews the wording and the command sends the character, the two players and the same wording

#### Scenario: After confirmation

- **WHEN** the step is confirmed and the draft is cleared
- **THEN** the card and the journal read the recorded answer, not the engine's prepared one

#### Scenario: A new target

- **WHEN** the host changes a target on a step that takes targets
- **THEN** the answer draft and its wording are cleared

#### Scenario: Privacy

- **WHEN** a poisoned actor's card is shown before or after confirmation
- **THEN** it contains no computed answer and no poisoning label

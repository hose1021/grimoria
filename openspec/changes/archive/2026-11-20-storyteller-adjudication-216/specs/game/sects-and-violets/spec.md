# Spec Delta

## ADDED Requirements

### Requirement: The Dreamer pair is checked

The Dreamer step SHALL record the shown pair of one good and one evil
character. While the ability works and no Vortox lives, exactly one character
SHALL be the chosen player's character or a character that player legally
registers as. A pair that the constraint excludes SHALL be refused with
`error.66` and SHALL change no state.

**Source**: [Dreamer r2904](https://wiki.bloodontheclocktower.com/index.php?title=Dreamer&oldid=2904) "Summary", "How to Run" and the Vortox example; [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118); [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007); [Vortox r3017](https://wiki.bloodontheclocktower.com/index.php?title=Vortox&oldid=3017); Issue #216
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: A sober Dreamer shows a pair

- **WHEN** a sober Dreamer without a living Vortox chooses a player
- **THEN** every offered pair holds the chosen player's character or a legal
  registered character, and a character of the opposite kind

#### Scenario: A Spy registers as another character

- **WHEN** the chosen player is a sober Spy or Recluse
- **THEN** a pair with a character that player may register as is legal

#### Scenario: The host submits a wrong pair

- **WHEN** the host submits a pair without a legal true character
- **THEN** the step is refused with `error.66` and nothing changes

#### Scenario: An impaired Dreamer may show a false pair

- **WHEN** the Dreamer is drunk or poisoned and no Vortox lives
- **THEN** the true pair and a false pair are both legal

#### Scenario: A Vortox forbids the true Dreamer pair

- **WHEN** a living Vortox is in play
- **THEN** no offered pair contains the chosen player's character

#### Scenario: The pair stays private and stored

- **WHEN** the host records a legal pair and the game is saved
- **THEN** the pair is a secret journal choice, export, import, preview,
  replay and undo keep it, and the public view omits it

### Requirement: The Dreamer pool is not narrowed by a script

The legal character pool SHALL be every supported character of the asked kind.
A custom script SHALL NOT narrow it. An empty legal list SHALL refuse every
answer instead of admitting a fabricated pair.

**Source**: [Dreamer r2904](https://wiki.bloodontheclocktower.com/index.php?title=Dreamer&oldid=2904) "How to Run"; Issue #216
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: A custom script keeps the legal answers

- **WHEN** the script lists only part of the edition
- **THEN** a supported character outside the script is still a legal answer

#### Scenario: No legal pair exists

- **WHEN** the chosen player has no character
- **THEN** no pair is offered and every submitted pair is refused

### Requirement: The Sage pair names the killer

The Sage step SHALL record the two players shown. While the ability works and
no Vortox lives, exactly one player SHALL be the Demon who killed the Sage. A
character or holder change after the kill SHALL NOT replace that player. A
death recorded before the attack stored its source SHALL fall back to the
current Demon.

**Source**: [Sage r3009](https://wiki.bloodontheclocktower.com/index.php?title=Sage&oldid=3009) "How to Run" and its example; Issue #216
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: A sober Sage shows two players

- **WHEN** a sober Sage dies to a Demon attack
- **THEN** every offered pair holds exactly the Demon who killed the Sage

#### Scenario: The Demon character moves after the kill

- **WHEN** the Killer's character moves to another player before the Sage wakes
- **THEN** every offered pair still holds the Killer, and the current holder is
  not required

#### Scenario: The host submits a pair without the Killer

- **WHEN** the host submits two players neither of whom killed the Sage
- **THEN** the step is refused with `error.66` and nothing changes

#### Scenario: A dead player is shown

- **WHEN** the host shows a pair with a dead second player
- **THEN** the pair is legal

### Requirement: The Sage pair uses the pinned option set

An impaired Sage SHALL accept a pair with or without the Killer. A living
Vortox SHALL forbid every pair with the Killer. The pair SHALL be a secret
journal choice that changes no game state and stays out of the public view.

**Source**: [Sage r3009](https://wiki.bloodontheclocktower.com/index.php?title=Sage&oldid=3009) "How to Run"; [Vortox r3017](https://wiki.bloodontheclocktower.com/index.php?title=Vortox&oldid=3017); Issue #216
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: An impaired Sage may show a false pair

- **WHEN** the Sage is drunk or poisoned at the step and no Vortox lives
- **THEN** a pair with the Killer and a pair without it are both legal

#### Scenario: A Vortox forbids the Killer pair

- **WHEN** a living Vortox is in play
- **THEN** no offered pair contains the Killer

### Requirement: A released journal keeps its Dreamer and Sage answers

A command recorded before the checked-pair version SHALL keep its free-text
note answer and SHALL replay without a pair. A current command SHALL require
the checked pair. Import, export, replay, undo and continuing an old game SHALL
preserve the recorded answers and SHALL NOT fabricate a host decision.

**Source**: Issue #216; the released 0.4.1 journal format
**Tests**: `src/core/engine/snv.test.ts`; `src/core/engine/fixtures/legacy-dreamer-sage-game.json`

#### Scenario: An old journal completes a sober Dreamer and Sage

- **WHEN** a 0.4.1 journal without a pair is imported and replayed
- **THEN** both steps complete with the old free-text note and the state equals
  the saved state

#### Scenario: An old false answer stays free text

- **WHEN** an old command carries a note answer for a Vortox or impaired
  Dreamer
- **THEN** the command is accepted and the note is stored

#### Scenario: A current command requires the pair

- **WHEN** a current command completes a sober Dreamer without a pair, or with
  a note
- **THEN** the step asks for the checked pair and changes nothing

#### Scenario: The game continues after an old command

- **WHEN** an old journal is undone and the night is ended with a current
  command
- **THEN** the command is accepted

# Spec Delta

## ADDED Requirements

### Requirement: The Dreamer pair is checked and private

The Dreamer step SHALL record the shown pair of one good and one evil
character. While the ability works and no Vortox lives, exactly one character
SHALL be the chosen player's character. A pair that the constraint excludes
SHALL be refused with `error.66` and SHALL change no state. The pair SHALL be a
secret journal choice and SHALL stay out of the public view.

**Source**: [Dreamer r2904](https://wiki.bloodontheclocktower.com/index.php?title=Dreamer&oldid=2904) "Summary", "How to Run" and the Vortox example; [Vortox r3017](https://wiki.bloodontheclocktower.com/index.php?title=Vortox&oldid=3017); Issue #216
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: A sober Dreamer shows a pair

- **WHEN** a sober Dreamer without a living Vortox chooses a player
- **THEN** every offered pair holds the chosen player's character and a
  character of the opposite kind

#### Scenario: The host submits a wrong pair

- **WHEN** the host submits a pair without the chosen player's character
- **THEN** the step is refused with `error.66` and nothing changes

#### Scenario: An impaired Dreamer may show a false pair

- **WHEN** the Dreamer is drunk or poisoned and no Vortox lives
- **THEN** the true pair and a false pair are both legal

#### Scenario: A Vortox forbids the true Dreamer pair

- **WHEN** a living Vortox is in play
- **THEN** no offered pair contains the chosen player's character

#### Scenario: The Dreamer pair survives storage

- **WHEN** the host records a legal pair and the game is saved
- **THEN** export, import, preview, replay and undo keep the pair, and the
  public view omits it

### Requirement: The Sage pair is checked and private

The Sage step SHALL record the two players shown. While the ability works and
no Vortox lives, exactly one player SHALL be the Demon. A pair that the
constraint excludes SHALL be refused with `error.66` and SHALL change no state.
The pair SHALL be a secret journal choice and SHALL stay out of the public view.

**Source**: [Sage r3009](https://wiki.bloodontheclocktower.com/index.php?title=Sage&oldid=3009) "How to Run" and its example; [Vortox r3017](https://wiki.bloodontheclocktower.com/index.php?title=Vortox&oldid=3017); Issue #216
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: A sober Sage shows two players

- **WHEN** a sober Sage dies to a Demon attack
- **THEN** every offered pair holds exactly one Demon

#### Scenario: The host submits a pair without the Demon

- **WHEN** the host submits two players who are not the Demon
- **THEN** the step is refused with `error.66` and nothing changes

#### Scenario: An impaired Sage may show a false pair

- **WHEN** the Sage is drunk or poisoned at the step and no Vortox lives
- **THEN** a pair with the Demon and a pair without it are both legal

#### Scenario: A Vortox forbids the Demon pair

- **WHEN** a living Vortox is in play
- **THEN** no offered pair contains the Demon

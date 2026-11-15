## ADDED Requirements

### Requirement: Evil Twin host correction

The engine SHALL let the Storyteller correct the Evil Twin pair through the
`manualCorrection` command with `kind: "twin"`, SHALL require an Evil Twin
holder, a different living partner of the opposite real alignment and a
non-empty reason, SHALL write both stored player ids and the good twin's role
on success, and SHALL change no setup field on rejection.

**Source**: [Evil Twin r3101](https://wiki.bloodontheclocktower.com/index.php?title=Evil_Twin&oldid=3101)
**Tests**: `src/core/engine/twin-correction.test.ts`

#### Scenario: Evil holder with a good partner

- **WHEN** the holder has the `eviltwin` character and the host names a living
  good player
- **THEN** the command stores the holder as the evil twin, the named player as
  the good twin and the good player's role as the setup role

#### Scenario: Good holder with an evil partner

- **WHEN** a good player holds `eviltwin` after a character change and the host
  names a living evil player
- **THEN** the command stores the good holder first and the evil partner second

#### Scenario: Not an Evil Twin holder

- **WHEN** the named player does not hold the `eviltwin` character
- **THEN** the command is rejected with `error.75` and the setup is unchanged

#### Scenario: Same alignment

- **WHEN** the named partner has the same real alignment as the holder
- **THEN** the command is rejected with `error.76` and the setup is unchanged

#### Scenario: Replay and privacy

- **WHEN** the correction is applied through `applyCommand`
- **THEN** the applied id is recorded and the pair is not exposed in the public
  or player projections

## MODIFIED Requirements

### Requirement: Evil Twin pair after a character change

The engine SHALL keep the Evil Twin pair as the two players the Storyteller
chose, SHALL NOT infer an opposing player, SHALL leave both player ids unset
when a character gained mid-game makes a player the `eviltwin` holder, SHALL
reject `endNight` with `error.77` while a living holder has no chosen pair, and
SHALL treat the current holder of the `eviltwin` character (either pair member)
as the ability holder. It SHALL award evil the win when the executed player is
the good-aligned pair member and the holder is alive and unimpaired at the
execution, and SHALL keep the both-live block only for a chosen pair.

**Source**: [Evil Twin r3101](https://wiki.bloodontheclocktower.com/index.php?title=Evil_Twin&oldid=3101)
**Tests**: `src/core/engine/snv.test.ts`, `src/core/engine/evil-twin-choice.test.ts`

#### Scenario: A Pit-Hag-created Evil Twin

- **WHEN** the Pit-Hag creates an Evil Twin
- **THEN** the pair stays unset until the host records the partner with the
  `twin` correction, and the night cannot end before that correction

#### Scenario: A chosen pair after a swap

- **WHEN** a swap moves a twin's character to another player and the pair was
  chosen
- **THEN** the pair stays with the same players and executing the good-aligned
  twin still wins for evil

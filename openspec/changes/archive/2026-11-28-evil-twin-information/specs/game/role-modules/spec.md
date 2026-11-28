## ADDED Requirements

### Requirement: Evil Twin introduction capability

The Evil Twin role module SHALL declare an `information` capability with
`infoKind: "eviltwin"` and keep its first-night `night-step`. Its resolver
SHALL name the two paired players, the Evil Twin first, each with the
character the other learns, and SHALL return a note with no shown players when
the pair is absent.

**Source**: [Evil Twin r3101](https://wiki.bloodontheclocktower.com/index.php?title=Evil_Twin&oldid=3101); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #211](https://github.com/hose1021/grimoria/issues/211)
**Tests**: `src/core/roles/eviltwin/role.test.ts`, `src/core/engine/snv.test.ts`

#### Scenario: The introduction follows the printed wake

- **WHEN** the Evil Twin's resolver runs with the validated pair
- **THEN** it returns the Evil Twin with its character first and the Good Twin with its character second

#### Scenario: An unpaired holder names nobody

- **WHEN** the information facts carry no pair
- **THEN** the resolver returns a note without shown players

#### Scenario: The role reads only the pair

- **WHEN** the resolver runs
- **THEN** it reads `twins` and `actualRoleOf` and no registration, impairment or ability state

### Requirement: The note record names the shown players

The information contract SHALL offer an optional `shown` list on the `note`
decision arm, each entry carrying a player id and a character or null. A shown
entry SHALL NOT carry a player name, and a note SHALL still carry no answer,
choice, options or impairment flag.

**Source**: [Evil Twin r3101](https://wiki.bloodontheclocktower.com/index.php?title=Evil_Twin&oldid=3101); `docs/adr/0002-engine-contracts.md` §4; [Issue #211](https://github.com/hose1021/grimoria/issues/211)
**Tests**: `src/core/roles/ability.test-d.ts`, `src/core/roles/eviltwin/role.test.ts`

#### Scenario: A role cannot add presentation

- **WHEN** a role returns a shown entry with a `name` or without its character field
- **THEN** the type checker rejects it

#### Scenario: The engine supplies the validated pair

- **WHEN** the engine builds the information facts
- **THEN** `twins` is the pair its caller validated, or null, and the facts module imports no death code

### Requirement: The engine keeps the Evil Twin wrapper

The engine SHALL keep the introduction's text key, variables, Russian
fallback, field order, secret journal line and projection unchanged. It SHALL
record `shown` on the step's `given` only for a command at or after
`tb-bmr-snv-2026-11-21.1`, appended last. A command recorded before it SHALL
replay its text-only note.

**Source**: [Evil Twin r3101](https://wiki.bloodontheclocktower.com/index.php?title=Evil_Twin&oldid=3101); [Issue #211](https://github.com/hose1021/grimoria/issues/211)
**Tests**: `src/core/engine/snv.test.ts`, `src/core/engine/evil-twin-choice.test.ts`, `src/core/engine/information-facts.test.ts`

#### Scenario: A current introduction is typed

- **WHEN** the Evil Twin's first-night step is completed at the current ruleset
- **THEN** its `given` holds the two shown players, Evil Twin first, after the text fields

#### Scenario: An older journal keeps its bytes

- **WHEN** a command recorded under `tb-bmr-snv-2026-11-21` is replayed
- **THEN** its `given` keeps the text-only note and replay and undo finish as written

#### Scenario: A missing pair stays a missing note

- **WHEN** the pair is unset, invalid, the holder is dead, or the holder is drunk or poisoned
- **THEN** the step stores the missing note and no shown players

### Requirement: The Evil Twin introduction is private and replayable

The shown players SHALL stay out of the public projection and SHALL survive
preview, apply, replay, undo and export/import.

**Source**: [Evil Twin r3101](https://wiki.bloodontheclocktower.com/index.php?title=Evil_Twin&oldid=3101); [Issue #211](https://github.com/hose1021/grimoria/issues/211)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: The record is not public

- **WHEN** a completed introduction is projected through the public game view
- **THEN** the serialized view contains neither the shown list nor the two characters

#### Scenario: Replay reproduces the record

- **WHEN** the journal is replayed, undone and exported/imported
- **THEN** the restored `given` equals the recorded introduction

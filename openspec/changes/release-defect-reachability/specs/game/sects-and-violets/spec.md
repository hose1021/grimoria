# Spec Delta

## ADDED Requirements

### Requirement: The Pit-Hag death control follows the drafted character

The Storyteller console SHALL expose the Pit-Hag's arbitrary-death control before
the completion only when the drafted character is a not-in-play Demon, and the
engine SHALL reject a recorded death when that condition is not met.

**Source**: [Pit-Hag r2998](https://wiki.bloodontheclocktower.com/index.php?title=Pit-Hag&oldid=2998); Issue #219
**Tests**: `src/ui/screens/table/helpers.test.ts`, `scripts/browser-check.ts`

#### Scenario: Drafted Demon

- **WHEN** the host drafts a not-in-play Demon for the Pit-Hag
- **THEN** the death control appears and the confirmed command records the
  chosen deaths

#### Scenario: In-play character

- **WHEN** the host drafts a character already in play
- **THEN** no death control appears and a forced death is rejected

### Requirement: Recorded information pairs remain inspectable

The Storyteller journal SHALL keep the recorded Dreamer and Sage pairs and SHALL
allow the host to read the full history independently of the eight-line preview,
without exposing either pair in the public projection.

**Source**: [Dreamer r2904](https://wiki.bloodontheclocktower.com/index.php?title=Dreamer&oldid=2904), [Sage r3009](https://wiki.bloodontheclocktower.com/index.php?title=Sage&oldid=3009); Issue #216
**Tests**: `src/core/engine/snv.test.ts`, `scripts/browser-check.ts`

#### Scenario: Pair beyond the preview

- **WHEN** more than eight journal lines follow a recorded pair
- **THEN** the pair is absent from the preview and present after the host
  expands the full journal

#### Scenario: Reload and privacy

- **WHEN** the page reloads
- **THEN** the pair remains inspectable and stays absent from the public view

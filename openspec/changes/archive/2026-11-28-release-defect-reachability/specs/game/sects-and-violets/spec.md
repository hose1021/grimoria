# Spec Delta

## ADDED Requirements

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

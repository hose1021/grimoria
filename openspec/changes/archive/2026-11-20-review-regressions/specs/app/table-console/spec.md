## ADDED Requirements

### Requirement: Current-script role correction choices

The role correction dialog SHALL offer the active script's characters and
SHALL persist an accepted correction through the existing command boundary.

**Source**: [Bad Moon Rising r2871](https://wiki.bloodontheclocktower.com/index.php?title=Bad_Moon_Rising&oldid=2871), [Sects & Violets r3127](https://wiki.bloodontheclocktower.com/index.php?title=Sects_%26_Violets&oldid=3127); `SPEC.md` manual corrections.
**Tests**: `scripts/browser-check.ts`

#### Scenario: Correct a BMR or Sects and Violets character

- **WHEN** the host opens role correction in either supported scenario
- **THEN** the dialog offers that script's roles and a valid choice persists

## ADDED Requirements

### Requirement: The secrets editor shows a stored zero for the Librarian alone

The secrets screen SHALL show a stored zero as the zero answer under the
Librarian only, real or a Drunk's mask. Under the Washerwoman or the
Investigator it SHALL show the character and the two players, with no zero
control and no note about Outsiders, so that choosing them replaces the zero.
The first-night step that holds such a zero SHALL show the setup warning with
the link to the secrets screen.

**Source**: [Librarian r1721](https://wiki.bloodontheclocktower.com/index.php?title=Librarian&oldid=1721), [Washerwoman r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630), [Investigator r2983](https://wiki.bloodontheclocktower.com/index.php?title=Investigator&oldid=2983); `SPEC.md` `/secrets`; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/ui/screens/secrets-options.test.ts`, `scripts/browser-check.ts`

#### Scenario: The step of a Washerwoman that holds a zero

- **WHEN** a zero is stored for the Washerwoman during the first night and the host opens her step at 390 px
- **THEN** the step says that the information is not prepared, links to the secrets screen, cannot be confirmed, shows no sentence about Outsiders and offers no zero, and the page has no horizontal overflow

#### Scenario: The editor keeps the fields

- **WHEN** the host follows the link
- **THEN** the Washerwoman's editor shows the character select and the two player selects, and no zero control

#### Scenario: The host repairs the record

- **WHEN** the host chooses a character and two players there and returns to the table
- **THEN** the step can be confirmed and stores that character and those players

#### Scenario: The Librarian's stored zero

- **WHEN** a zero is stored for the Librarian
- **THEN** the Librarian's editor shows the zero control checked, with the note, and no character select

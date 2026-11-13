# Spec Delta

## MODIFIED Requirements

### Requirement: Role sheet parity

`/sheet` SHALL render the 72 standard roles across the three scripts and the 5
Travellers in their separate section, filter by scenario, switch language
between Russian, English and Azerbaijani, and show each role's artwork. The
header SHALL carry no route link and no language control: the app bar menu is
the only navigation surface. The screen SHALL be read-only: it SHALL NOT
dispatch commands or persist anything.

**Source**: `SPEC.md` "Screens"; issue #69; owner screenshot review of
`/sheet/ru`
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Role counts

- **WHEN** `/sheet/en` opens with no filter
- **THEN** 72 standard roles and 5 Travellers are present

#### Scenario: Scenario filter

- **WHEN** the Trouble Brewing filter is active
- **THEN** only that script's roles remain and the Travellers stay in their own
  section

#### Scenario: Language switch

- **WHEN** the host opens the app bar menu and chooses Azerbaijani while the
  sheet is open
- **THEN** the names and abilities come from that catalog, the URL ends in
  `/sheet/az`, and the scenario and Travellers preferences are unchanged

#### Scenario: One navigation surface

- **WHEN** `/sheet/ru` renders at 390 or 1440 CSS pixels
- **THEN** the header shows the title, intro, summary and filters, with no route
  link and no language control, and the app bar menu carries the table, Help
  and language controls

#### Scenario: Read-only

- **WHEN** the sheet is used
- **THEN** no command is dispatched and the saved game is unchanged

## MODIFIED Requirements

### Requirement: One token source

The new UI SHALL read its colours, spacing and typography from the tokens
already defined in `css/app.css`. It SHALL NOT introduce a second palette, and a
token used by the UI SHALL NOT carry a different value in the shell than in the
legacy stylesheet. A new visual value SHALL be added to the shared source first.
After the last legacy route migrates, the shared source SHALL carry the Arcane
Instrument values only.

**Source**: `SPEC.md` "Design"; issue #69; Arcane Instrument change
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Values agree

- **WHEN** a token used by the shell is read from both stylesheets
- **THEN** the values are equal

#### Scenario: New value needs a source

- **WHEN** the shell needs a colour the shared source does not define
- **THEN** the value is added to the source, not defined only in the shell

#### Scenario: Legacy value is not reused

- **WHEN** a screen needs the Arcane surface or accent colour
- **THEN** it uses the Arcane token, not a legacy colour token remapped by eye

### Requirement: Token use is checked

A repository check SHALL fail when the shell references a token the source does
not define, when a source token used by the shell changes value, or when a
component declares a literal colour outside the token source. The check SHALL
run in the same gate as the type and boundary checks.

**Source**: `AGENTS.md` "Development Commands"; issue #69; Arcane Instrument change
**Tests**: `scripts/check-types-policy.test.mjs`, `scripts/browser-check.mjs`

#### Scenario: Missing token

- **WHEN** the shell uses a token absent from the source
- **THEN** the check exits non-zero and names the token and the file

#### Scenario: Changed value

- **WHEN** the source token changes value but the shell expects the old one
- **THEN** the check fails instead of shipping a silent visual change

#### Scenario: Literal colour

- **WHEN** a file under `src/ui` contains a hexadecimal or functional colour
  literal instead of a token
- **THEN** the check fails and names the file and value

## ADDED Requirements

### Requirement: Arcane material tokens

The shared token layer SHALL define the Arcane Instrument material set: the
stone surface scale, panel and raised surfaces, two edge values, brass, amber
with a dim and a bright value, crimson with a dim value, parchment and ink, wax,
three corner radii and at most two elevation values. Every token SHALL have a
Tailwind theme name and a matching source value.

**Source**: owner-selected Arcane Instrument direction; `design/prototypes/03-arcane-instrument-full.html`
**Tests**: `scripts/check-types-policy.test.mjs`

#### Scenario: Surface scale

- **WHEN** a screen needs the page, panel and raised surface colours
- **THEN** three distinct stone tokens are available and used

#### Scenario: Accent separation

- **WHEN** a primary action and a dangerous action render together
- **THEN** they use the amber and crimson tokens respectively

#### Scenario: Radius scale

- **WHEN** a control, a panel and a dialog render
- **THEN** each uses one of the three defined radii and no arbitrary value

### Requirement: Legacy palette retirement

After every route uses the Arcane tokens, the legacy-only colour names SHALL be
removed from the source, the theme and the token map. No screen SHALL read a
retired name, and the offline build SHALL ship no unused palette value.

**Source**: `AGENTS.md` "Code Conventions"; `SPEC.md` "CSS and accessibility"
**Tests**: `scripts/check-types-policy.test.mjs`, `scripts/browser-check.mjs`

#### Scenario: Retired name

- **WHEN** a component references a legacy colour token after the cutover
- **THEN** the styling check fails and names the token

#### Scenario: No dead value

- **WHEN** the theme is built after the cutover
- **THEN** it contains no legacy-only colour token

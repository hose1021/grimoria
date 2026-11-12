## MODIFIED Requirements

### Requirement: One token source

The application SHALL declare colours, spacing, radius and typography once, in
the `@theme` block of the global stylesheet, and SHALL NOT declare the same
value a second time. A screen SHALL read a value through a utility class or a
custom-property reference to that block. A visual value the block does not
define SHALL be added to it before use. The Arcane Instrument values SHALL be
the source values, and a screen needing an Arcane surface or accent SHALL use
its token rather than a legacy colour remapped by eye.

**Source**: `SPEC.md` "Design"; issue #69; issue #137; Arcane Instrument change
**Tests**: `scripts/check-types-policy.test.mjs`, `scripts/browser-check.mjs`

#### Scenario: Values agree

- **WHEN** a token is read from the theme block and from a utility class that
  uses it
- **THEN** both render the same value

#### Scenario: New value needs a source

- **WHEN** a screen needs a colour the theme does not define
- **THEN** the value is added to the theme block, not to a component, an
  arbitrary value or an inline style

#### Scenario: Nothing is defined twice

- **WHEN** the same value is declared in the theme block and again in a base or
  component rule
- **THEN** the policy check reports the duplicate declaration

#### Scenario: Legacy value is not reused

- **WHEN** a screen needs the Arcane surface or accent colour
- **THEN** it uses the Arcane token, not a legacy colour token remapped by eye

### Requirement: Token use is checked

A repository check SHALL fail when the repository tracks a second stylesheet,
when the theme declares a token that no utility class or rule uses, or when a
custom-property reference resolves to no declared token. The check SHALL run in
the same gate as the type and boundary checks.

**Source**: `AGENTS.md` "Development Commands"; issue #69; issue #137; Arcane Instrument change
**Tests**: `scripts/check-types-policy.mjs`, `scripts/check-types-policy.test.mjs`

#### Scenario: Missing token

- **WHEN** a screen or the stylesheet references a custom property that the
  theme does not declare
- **THEN** the check exits non-zero and names the file and the property

#### Scenario: Changed value

- **WHEN** a theme value changes and the recorded computed-style baseline still
  expects the old value
- **THEN** the parity check fails instead of shipping a silent visual change

#### Scenario: Extra stylesheet

- **WHEN** a stylesheet other than the global one is tracked
- **THEN** the check exits non-zero and names the file

#### Scenario: Unused token

- **WHEN** the theme declares a token that no class or rule uses
- **THEN** the check exits non-zero and names the token

## ADDED Requirements

### Requirement: Arcane material tokens

The shared token layer SHALL define the Arcane Instrument material set: the
stone surface scale, panel and raised surfaces, two edge values, brass, amber
with a dim and a bright value, crimson with a dim value, parchment and ink, two
corner radii and at most two elevation values. Every token SHALL have a Tailwind
theme name and a matching source value.

**Source**: owner-selected Arcane Instrument direction; `design/prototypes/03-arcane-instrument-full.html`
**Tests**: `scripts/check-types-policy.test.mjs`

#### Scenario: Surface scale

- **WHEN** a screen needs the page, panel and raised surface colours
- **THEN** three distinct stone tokens are available and used

#### Scenario: Accent separation

- **WHEN** a primary action and a dangerous action render together
- **THEN** they use the amber and crimson tokens respectively

#### Scenario: Radius scale

- **WHEN** a control and a panel render
- **THEN** each uses one of the two defined radii and no arbitrary value

### Requirement: Legacy palette retirement

After every route uses the Arcane tokens, the legacy-only colour names SHALL be
removed from the source and the theme. No screen SHALL read a retired name, and
the offline build SHALL ship no unused palette value.

**Source**: `AGENTS.md` "Code Conventions"; `SPEC.md` "CSS and accessibility"
**Tests**: `scripts/check-types-policy.test.mjs`, `scripts/browser-check.mjs`

#### Scenario: Retired name

- **WHEN** a component references a legacy colour token after the cutover
- **THEN** the styling check fails and names the token

#### Scenario: No dead value

- **WHEN** the theme is built after the cutover
- **THEN** it contains no legacy-only colour token

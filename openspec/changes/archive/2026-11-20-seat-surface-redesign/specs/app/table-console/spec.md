# Spec Delta

## MODIFIED Requirements

### Requirement: Table theme tokens and visual scope

The table's felt surface, rail, action colours, parchment card and ink SHALL be
declared in the one `@theme` block before use, and the table tokens SHALL alias
the shared obsidian palette instead of restating its values. A value the table
needs SHALL be added there, not to a component or an inline style, and the token
policy check SHALL fail on an unused or sourced-less token. The table
composition SHALL apply to `/table` and to the `/seat` ring; the shared palette
SHALL apply to every route. No second stylesheet and no new runtime dependency
SHALL be introduced.

**Source**: [Issue #164](https://github.com/hose1021/grimoria/issues/164); `app/design-tokens` "One token source"; owner-selected Obsidian & Antique Gold direction
**Tests**: `scripts/check-types-policy.ts`; `scripts/browser-check.ts`

#### Scenario: Token source

- **WHEN** a table colour is used
- **THEN** its value is declared in the `@theme` block or aliases a shared token
  there, and the token policy check passes

#### Scenario: Other routes

- **WHEN** the table surface is applied
- **THEN** no route other than `/table` and the `/seat` ring changes
  composition, and every route reads the shared obsidian palette

#### Scenario: Seat ring extent

- **WHEN** `/seat` renders its ring
- **THEN** it uses the table rail, felt, chip and action tokens without adding a
  token or a screen stylesheet

#### Scenario: Unused addition

- **WHEN** a change declares a token that no class or rule uses
- **THEN** the token policy check fails and names the token

# Spec Delta

## MODIFIED Requirements

### Requirement: Arcane material tokens

The shared token layer SHALL define the obsidian semantic set: three surfaces
(#0B0F14 page, #141B23 panel, #202C38 raised), two edges (#364654 and its
lighter value), primary text #F0F3F5 and secondary text #A9B9C8, primary
#45B8A9 and its hover #60D2BF, antique gold #E2AE65, success #74C69D, selected #1E3438, disabled #697C8C, danger
#EF7779, parchment and ink, the control gradients, the field surface, the page
falloff, the banner surfaces, two corner radii and at most two elevation
values. Every token SHALL have a Tailwind theme name and a matching source
value.

**Source**: owner-selected Obsidian & Antique Gold direction; `design/prototypes/03-arcane-instrument-full.html`
**Tests**: `scripts/check-types-policy.test.ts`

#### Scenario: Surface scale

- **WHEN** a screen needs the page, panel and raised surface colours
- **THEN** three distinct obsidian tokens are available and used

#### Scenario: Accent separation

- **WHEN** a primary action, a phase label and a dangerous action render
- **THEN** they use the turquoise, gold and danger tokens respectively

#### Scenario: Radius scale

- **WHEN** a control and a panel render
- **THEN** each uses one of the two defined radii and no arbitrary value

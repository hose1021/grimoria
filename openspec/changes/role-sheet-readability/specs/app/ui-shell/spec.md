# Spec Delta

## ADDED Requirements

### Requirement: Sheet role legibility

The role sheet SHALL show every role's name and ability in full: no CSS line
clamp, no ellipsis, and no clipped or scrollable text inside the card. The card
SHALL grow to the height the text needs. The role name SHALL render at 16 px or
larger and the ability at 12 px or larger in every sheet language.

**Source**: issue #143; `SPEC.md` "Screens"; `AGENTS.md` "Testing & QA"
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Long ability in Russian

- **WHEN** `/sheet/ru` renders all 72 standard roles at 1280 px
- **THEN** the Pit-Hag card shows its complete ability with no ellipsis and no
  clipped content

#### Scenario: Every width and language

- **WHEN** the sheet shows 72 standard roles at 320, 360, 390, 768, 1280 or
  1440 px, with the Travellers toggle on
- **THEN** every card shows ability text equal to the loaded catalog, computed
  `-webkit-line-clamp: none`, no clipped content, name at least 16 px and
  ability at least 12 px

#### Scenario: Read-only behaviour is preserved

- **WHEN** the sheet is filtered, its language is switched, or it is reloaded
- **THEN** the scenario, Travellers and language behaviour is unchanged and the
  saved game stays unmodified

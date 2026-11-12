# Spec Delta

## ADDED Requirements

### Requirement: Requested keys resolve in every catalog

Every literal UI key a screen requests through the translator SHALL exist in the
Russian, English and Azerbaijani catalogs, so no screen renders a raw key.

**Source**: issue #135; `anti-slop/audit-001-2026-11-12.md` finding 3
**Tests**: `src/ui/i18n/copy.test.ts`, `scripts/browser-check.mjs`

#### Scenario: Literal key scan

- **WHEN** the copy test collects every literal key from `t("...")` and the
  strings port calls under `src/ui` and `src/entry`
- **THEN** each key exists in all three catalogs and the test reports any
  missing key with its file

#### Scenario: Bag preset button

- **WHEN** the bag preset cards render in any of the three languages
- **THEN** each button shows a translated label and never the text "preview"

### Requirement: User-visible copy contains no em dash

The Russian, English and Azerbaijani UI catalogs SHALL NOT contain the em dash
character U+2014 in any value. Text a screen supplies directly SHALL follow the
same rule. A screen MAY still supply the character on its own as the
empty-value glyph.

**Source**: issue #135; `anti-slop/audit-001-2026-11-12.md` finding 1
**Tests**: `src/ui/i18n/copy.test.ts`

#### Scenario: Catalog scan

- **WHEN** the copy test walks every value in the three catalogs
- **THEN** no value contains U+2014

#### Scenario: Screen text scan

- **WHEN** the copy test reads the screens under `src/ui` and `src/entry`
- **THEN** no string except the isolated empty-value glyph contains U+2014

#### Scenario: Rewritten strings keep their meaning

- **WHEN** a dashed sentence is rewritten with a period, comma or colon
- **THEN** its placeholders and its meaning stay the same in all three languages

## ADDED Requirements

### Requirement: Language changes and announcements reflect available translations

The app SHALL publish a new language only when its catalog loads successfully. Seat labels and editing announcements SHALL follow the selected language and translated messages SHALL preserve user-supplied values literally.

**Source**: SPEC.md, seat editor and localization. [Setup r1361](https://wiki.bloodontheclocktower.com/index.php?title=Setup&oldid=1361), Gather Your Players
**Tests**: `src/infrastructure/catalog/load-locale.test.ts`, `src/ui/i18n/strings.test.ts`, `scripts/browser-check.ts`

#### Scenario: An unusable catalog finishes loading

- **WHEN** a language request completes without a usable catalog
- **THEN** the previous catalog remains active and the host can retry

#### Scenario: A seat action uses a player name

- **WHEN** the host swaps two seats or changes the language of an open seat editor
- **THEN** its controls and live announcement follow the selected language and display the player's literal name

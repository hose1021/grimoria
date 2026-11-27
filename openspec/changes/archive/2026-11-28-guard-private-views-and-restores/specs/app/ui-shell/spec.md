## ADDED Requirements

### Requirement: Private table displays follow their original context

The table SHALL cover an invalidated private handoff and prevent an unfinished correction from affecting another game or deal.

**Source**: [Setup r1361](https://wiki.bloodontheclocktower.com/index.php?title=Setup&oldid=1361), Prepare the Grimoire and Pass Out Character Tokens; SPEC.md, private player card
**Tests**: `src/ui/screens/table/handoff.test.ts`, `scripts/browser-check.ts`

#### Scenario: Game, assignment or step changes during a private handoff

- **WHEN** the displayed private content loses its original context
- **THEN** the player sees a cover with a return control, without seeing the replacement secret or host console

#### Scenario: A correction is open during game replacement

- **WHEN** the host drafted a correction before the current game or deal was replaced
- **THEN** the stale form cannot change the new game

### Requirement: Reference reading survives failed loads and navigation

The app SHALL expose a return to the character list, retain its search through a character visit, and distinguish incomplete reference data from a confirmed absence of interactions.

**Source**: SPEC.md, character reference; [Goon r2977](https://wiki.bloodontheclocktower.com/index.php?title=Goon&oldid=2977), Related Jinxes
**Tests**: `scripts/browser-check.ts`

#### Scenario: Read a character from a filtered list

- **WHEN** the reader opens a character and returns to the index
- **THEN** the character list is accessible and the reader can resume the same search

#### Scenario: Missing reference dataset

- **WHEN** the character data is pending or fails to load
- **THEN** the page displays the loading or retry state without reporting invented facts or an empty interaction list

### Requirement: Reading routes keep the requested page

Valid read-only reference, sheet and changelog pages SHALL resume at the same location after browser history restoration. Unrecognized sheet or reference paths SHALL follow the ordinary unknown-route fallback.

**Source**: SPEC.md, routing and public screens
**Tests**: `scripts/browser-check.ts`, `src/entry/page-restore.test.ts`, `src/ui/reference-route.test.ts`

#### Scenario: Return from an external page

- **WHEN** a reading page resumes from the browser's back-forward cache
- **THEN** the reader retains the same URL and location, while private and host routes retain the existing handoff behavior

#### Scenario: Invalid nested route

- **WHEN** a path resembles a sheet or reference URL but has an unsupported structure
- **THEN** the app follows its documented fallback

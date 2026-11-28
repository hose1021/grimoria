## ADDED Requirements

### Requirement: The reference lists every supported character

`/reference` SHALL list all 72 supported characters grouped by their scenario,
SHALL offer a name filter, and SHALL link each character to
`/reference/:roleId`. The page SHALL NOT read or write the saved game.

**Source**: `docs/rules-matrix.md` supported-role rows; `src/core/model/role-ids.ts`
**Tests**: `src/ui/screens/reference/reference-data.test.ts`

#### Scenario: Opening the discovery page

- **WHEN** the Storyteller opens `/reference`
- **THEN** the page shows Trouble Brewing, Bad Moon Rising and Sects & Violets groups with 72 character links in total

#### Scenario: Filtering by name

- **WHEN** the Storyteller types part of a localized character name
- **THEN** only the matching characters remain, and clearing the field restores the full list

#### Scenario: An unsupported id

- **WHEN** the Storyteller opens `/reference/unknown-role`
- **THEN** the page shows the not-found message and a link back to `/reference`

### Requirement: The detail shows the engine's decision and the host's decision

`/reference/:roleId` SHALL show the localized ability, the engine facts (setup,
first-night and other-night wake, uses, target, reminder tokens), the localized
console note, the host decision for each rule, the engine behaviour for each
rule with its rule id and status, the verified example scenarios, a quick
reference and the pinned source. The screen SHALL NOT dispatch a command or
write `pg.game.v4`.

**Source**: `docs/rules-matrix.md` rows `TB-CHEF-01`, `BMR-ASSASSIN-01`,
`BMR-ASSASSIN-02`, `SNV-BARBER-01`; `src/core/roles/registry.ts`
**Tests**: `src/ui/screens/reference/reference-data.test.ts`

#### Scenario: A supported character

- **WHEN** the Storyteller opens `/reference/assassin` in Russian
- **THEN** the page shows «Один раз за игру: выберите игрока…», «Выберите цель» for `BMR-ASSASSIN-01`, the engine behaviour for both Assassin rules, the verified scenarios and the pinned revision `r1786`

#### Scenario: A rule that needs the host

- **WHEN** a rule has status `host-choice`
- **THEN** its label reads «Решение ведущего» and its decision is shown without the engine claiming a computed answer

#### Scenario: The page is open during a game

- **WHEN** the Storyteller opens a reference page while a saved game is active
- **THEN** the game state, the journal and the save are unchanged

### Requirement: Interactions come from the official catalog

The interactions section SHALL list only jinx pairs from
`docs/official/jinxes.json` where both characters are supported. Each listed
character name SHALL link to its reference page. A character with no supported
pair SHALL show that it has no separate interactions.

**Source**: `docs/official/jinxes.json`; `docs/rules-matrix.md` supported roles
**Tests**: `src/ui/screens/reference/reference-data.test.ts`

#### Scenario: A supported jinx

- **WHEN** the Storyteller opens `/reference/pithag`
- **THEN** the interactions section names the Goon, links to `/reference/goon`, and states the Pit-Hag–Goon reason in the current locale

#### Scenario: No supported jinx

- **WHEN** a character has no jinx pair inside the supported set
- **THEN** the section reads «Для этого персонажа нет отдельных взаимодействий.»

### Requirement: The Russian reference mirrors the English dataset

The Russian dataset SHALL translate every `when`, `behavior`, `decision`,
example and interaction reason of the English dataset, SHALL keep the same role
set, rule ids, statuses and example counts, and SHALL NOT show internal `SYS-`
or `INFO-` rule ids. A structural mismatch SHALL fail the test suite. The page
SHALL load the Russian dataset for `ru`, the English dataset for `en`, and the
English dataset for `az` while the Azerbaijani catalog is incomplete.

**Source**: `docs/rules-matrix.md`; `docs/official/roles.json`
**Tests**: `src/ui/screens/reference/reference-data.test.ts`,
`src/ui/i18n/strings.test.ts`

#### Scenario: A matrix rule changes

- **WHEN** a rule id, status or example count changes in the English dataset without the Russian update
- **THEN** the parity test fails and names the role and rule

#### Scenario: Switching the language

- **WHEN** the Storyteller switches RU to EN on a reference page
- **THEN** the page reloads the English dataset, the labels change, and the ability comes from the English catalog

#### Scenario: Internal ids stay out of the page

- **WHEN** the datasets are built
- **THEN** no `SYS-` or `INFO-` id appears in a `when`, `behavior`, `decision` or example string

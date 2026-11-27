## ADDED Requirements

### Requirement: One obligation is open at a time

The setup-secrets screen SHALL list every obligation the script needs in one
index, SHALL show each obligation's answered state as a word and a mark, and
SHALL open exactly one obligation in the reading pane. The index SHALL count
the answered obligations against the total. The next unanswered obligation
SHALL open when the host has not chosen one.

**Source**: [Washerwoman r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630) "How to Run", [Librarian r1721](https://wiki.bloodontheclocktower.com/index.php?title=Librarian&oldid=1721) "How to Run", [Investigator r2983](https://wiki.bloodontheclocktower.com/index.php?title=Investigator&oldid=2983) "How to Run", [Fortune Teller r3123](https://wiki.bloodontheclocktower.com/index.php?title=Fortune_Teller&oldid=3123) "How to Run"; `SPEC.md` "Screens" (`/secrets`)
**Tests**: `scripts/browser-check.ts`, `src/ui/screens/secrets-options.test.ts`

#### Scenario: A fresh dealt game

- **WHEN** the host opens `/secrets` after the roles are dealt and every secret is unanswered
- **THEN** the index lists the red herring when a Fortune Teller is in play and one item for each information role in play, every item reads `○ выбрать`, and the first unanswered obligation is open

#### Scenario: A partial answer

- **WHEN** the host answers one pair and leaves the others
- **THEN** that item reads `✓ готово`, the count names the answered obligations against the total, and the other items keep `○ выбрать`

#### Scenario: Switching obligations

- **WHEN** the host activates another item in the index
- **THEN** the reading pane replaces its content with that obligation and the activated item carries `aria-current`

### Requirement: A pair is edited as the rule's sentence

Each information-role obligation SHALL render the one-of-two rule as a sentence
whose three controls are the two players and the character. The Drunk's shown
role SHALL use the same sentence with a Drunk tag and a false-information hint.
The Librarian's zero SHALL remain a checkbox answer, offered only while it is
legal or already stored. The screen SHALL NOT derive a value the Storyteller has
not chosen.

**Source**: [Washerwoman r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630) "You start knowing that 1 of 2 players is a particular Townsfolk", [Librarian r1721](https://wiki.bloodontheclocktower.com/index.php?title=Librarian&oldid=1721) "Or that zero are in play", [Investigator r2983](https://wiki.bloodontheclocktower.com/index.php?title=Investigator&oldid=2983), [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165) "How to Run"
**Tests**: `src/ui/screens/secrets-options.test.ts`, `scripts/browser-check.ts`

#### Scenario: A real information role

- **WHEN** the Washerwoman is in play
- **THEN** the open obligation reads «Один из [игрок] и [игрок] — [персонаж]», offers the Townsfolk held by players for the character, and offers every player for the two player slots

#### Scenario: A Drunk shown an information role

- **WHEN** the Drunk's shown role is the Washerwoman and no real Washerwoman is in play
- **THEN** the index item reads «Пьяница: Прачка», the pane carries the Drunk tag and the false-information hint, and the pair is stored for the Drunk

#### Scenario: The Librarian zero

- **WHEN** every Outsider in play can register as something else, or a zero is already stored
- **THEN** the editor offers the zero checkbox; when it is checked the pair fields are replaced by the zero note

#### Scenario: No derived answer

- **WHEN** the host opens an unanswered obligation
- **THEN** the character and both player slots stay empty until the host chooses them

### Requirement: The red herring, reminders and roster are reachable checks

The screen SHALL open the red herring as an obligation when a real Fortune
Teller is in play, with a sentence and the good players as options. The reminder
tokens and the role roster SHALL be reachable from the same index under a checks
group. The reminder list SHALL keep one row per role in play with reminders; the
roster SHALL warn against discussing roles before the first night.

**Source**: [Fortune Teller r3123](https://wiki.bloodontheclocktower.com/index.php?title=Fortune_Teller&oldid=3123) "put the Fortune Teller's RED HERRING reminder token by any good character token", [Washerwoman r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630) "put the Washerwoman's TOWNSFOLK reminder token"
**Tests**: `src/ui/screens/secrets-options.test.ts`, `scripts/browser-check.ts`

#### Scenario: The red herring

- **WHEN** a Fortune Teller is in play and the host opens the red herring
- **THEN** the pane reads «Гадалка видит демона в [игрок]» and offers only good players

#### Scenario: The checks

- **WHEN** the host opens the reminders or the roster from the checks group
- **THEN** the pane lists the role reminders with their tokens, or the roster with the seat, role and shown role of every player

### Requirement: Readiness and the start gate are preserved in every locale

The footer SHALL name the answered count while every answer is valid and the
first problem otherwise, and SHALL show exactly one primary action: names first,
then seats, then the first night. The first-night action SHALL stay disabled
while `secretsErrors` reports a problem. Every visible string in the route SHALL
come from a key present in `ru`, `en` and `az`.

**Source**: [Fortune Teller r3123](https://wiki.bloodontheclocktower.com/index.php?title=Fortune_Teller&oldid=3123) "The Red Herring is the same player throughout the entire game", [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165) "the Storyteller may give them false information instead"
**Tests**: `src/ui/i18n/strings.test.ts`, `scripts/browser-check.ts`

#### Scenario: An unfinished secret

- **WHEN** a pair or the red herring is missing
- **THEN** the footer names the first problem, the start action is disabled and the index carries the answered count

#### Scenario: Every secret answered

- **WHEN** every obligation is answered and the players are named and seated
- **THEN** the status reads ready and the start action starts the first night

#### Scenario: Translation coverage

- **WHEN** the locale catalogs are checked
- **THEN** every setup-secrets key exists in `ru`, `en` and `az` with the same placeholders

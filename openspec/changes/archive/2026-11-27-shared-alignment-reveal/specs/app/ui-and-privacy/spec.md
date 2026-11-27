# Spec Delta

## MODIFIED Requirements

### Requirement: Public and player privacy

Public and player views SHALL render a projection that contains no real role,
bluff, note, effect or private day-ability text, the player handoff SHALL expose
only the shown role and, for the Goon alone, the revealed alignment, and the
seat route SHALL render names and seat numbers only.

**Source**: `SPEC.md` "Runtime", "CSS and accessibility" and `/seat` "names only"; `AGENTS.md` "Architecture & Data Flow"; issue #171 SET8; [Goon r2977](https://wiki.bloodontheclocktower.com/index.php?title=Goon&oldid=2977), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039), [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/ui/screens/player-projection.test.ts`, `scripts/browser-check.ts` (`goon-alignment`)

#### Scenario: Public screen during a night

- **WHEN** the public screen is open during an active night
- **THEN** it shows phase, alive count, public deaths and no role or bluff element

#### Scenario: Export projection

- **WHEN** the public projection is built from a saved game
- **THEN** it contains no role, bluff, note, effect or Artist/Savant text field

#### Scenario: Private day ability

- **WHEN** the Artist question or the Savant statements are recorded
- **THEN** the public projection contains neither, and the Storyteller state and
  replay keep them

#### Scenario: Seat route

- **WHEN** the seat route renders a dealt game
- **THEN** the projection contains a player id, a seat number and a name and no
  role, shown role, team or alive field

#### Scenario: Goon alignment reveal

- **WHEN** the Goon's stored team is evil after a chooser changed it
- **THEN** that seat's `shownAlignment` is `evil` and the role card shows the evil
  alignment instead of the printed Outsider team

#### Scenario: Masked roles keep the mask

- **WHEN** a Lunatic or any player other than the Goon is projected
- **THEN** `shownAlignment` is `null`, the Lunatic keeps the shown Demon mask and
  no real role, team, note or effect appears

#### Scenario: Handoff projection keys

- **WHEN** the seat projection is serialized
- **THEN** each seat has exactly id, seat, name, claimed, shownRoleId and
  shownAlignment, and the text contains no roleId, team, effect or note field

# Spec Delta

## ADDED Requirements

### Requirement: Stadium table contour

The `/table` contour SHALL be a stadium: two parallel straight sides joined by
two semicircular caps. The rail, the felt surface and every seat centre SHALL
use that one contour. The contour SHALL be vertical on a phone and horizontal on
a desktop, and SHALL be recalculated from the measured table box and the player
count. No seat SHALL own the bottom centre.

**Source**: owner reference images (2026-11-16); `app/arcane-visual-system` "Material and palette roles"
**Tests**: `src/ui/screens/table/helpers.test.ts`, `scripts/browser-check.ts`

#### Scenario: Fifteen seats on a phone

- **WHEN** a fifteen-player table renders at 390 px
- **THEN** the contour is vertical, all fifteen seats sit on it inside the box,
  and no seat is centred at the bottom

#### Scenario: Fifteen seats on a desktop

- **WHEN** a fifteen-player table renders at 1440x900
- **THEN** the contour is horizontal and the table stays above the dock

#### Scenario: Resize

- **WHEN** the table box changes size
- **THEN** the seats move with the contour and keep their order

### Requirement: Equal perimeter spacing

Seats SHALL sit at equal arc distance along the contour, so spacing follows the
perimeter rather than the angles. Every seat SHALL keep its 44x44 target, and no
two seat medallions SHALL overlap.

**Source**: owner reference images (2026-11-16); `app/table-console` "Visible seats and role identity"
**Tests**: `src/ui/screens/table/helpers.test.ts`, `scripts/browser-check.ts`

#### Scenario: Five seats

- **WHEN** a five-player table renders
- **THEN** the seats are evenly spaced and none sits at the bottom centre

#### Scenario: Eight seats

- **WHEN** an eight-player table renders
- **THEN** the seats are evenly spaced and no medallion overlaps another

#### Scenario: Arc spacing

- **WHEN** the contour is circular
- **THEN** consecutive seat centres are the same distance apart

### Requirement: No poker furniture

The table SHALL show only engine state. It SHALL NOT render a pot, a chip
balance, community cards, a currency amount or any other table-game ornament
that has no game-state source.

**Source**: `SPEC.md` "Screens" (`/table`); `app/ui-and-privacy` "Public and player privacy"
**Tests**: `scripts/browser-check.ts`

#### Scenario: Reference ornament is absent

- **WHEN** the host opens `/table` with any game state
- **THEN** the stage contains no pot, chip balance, card strip or currency

#### Scenario: Hub stays factual

- **WHEN** the hub shows a label and a number
- **THEN** the pair names a recorded game value, not a placeholder amount

### Requirement: Squared table controls

Every interactive control in the `/table` stage and dock SHALL use the table
4 px radius and SHALL NOT be pill-shaped. The dock SHALL keep one muted
turquoise primary action, one neutral secondary action and one soft red danger
action, each at least 44 px high. Gold SHALL be reserved for the phase and for
accent numbers.

**Source**: owner reference images (2026-11-16); `app/arcane-visual-system` "Action hierarchy"
**Tests**: `scripts/browser-check.ts`

#### Scenario: Squared control

- **WHEN** a table-stage or dock button renders
- **THEN** its computed corner radius is 4 px or less and it is not a pill

#### Scenario: Dock action roles

- **WHEN** the dock renders a night step or a day
- **THEN** the primary, secondary and danger actions use their distinct table
  tokens and each control is at least 44 px high

#### Scenario: Utility row

- **WHEN** the dock renders
- **THEN** the undo, roster and menu controls stay reachable and squared

### Requirement: Hub numeric readout

The hub SHALL present its current reading with a small-caps label, one large
tabular numeral and a dot row. The numeral SHALL be the tally against the
threshold while a nomination is open, and the dot row SHALL mirror the same
count. The readout SHALL publish stored values only.

**Source**: owner reference images (2026-11-16); `app/table-console` "Vote threshold and execution result"
**Tests**: `scripts/browser-check.ts`

#### Scenario: Nomination hero

- **WHEN** a nomination is open with five votes of eight
- **THEN** the hub shows the small-caps label, `5 / 8` as the largest numeral
  and eight dots of which five are filled

#### Scenario: No nomination

- **WHEN** no nomination is open and no dawn report waits
- **THEN** the hub states that no nomination is open and shows no invented tally

### Requirement: Table surface material

The `/table` stage SHALL use the table surface token family: one raised stadium
rail and one inner felt surface on the same contour. The felt SHALL use one tone
in both phases, and the phase SHALL stay readable as dock text. The surface
SHALL stay a single-hue gradient, not a multi-colour decoration.

**Source**: owner reference images (2026-11-16); `app/arcane-visual-system` "Material and palette roles"
**Tests**: `scripts/browser-check.ts`, `scripts/check-types-policy.ts`

#### Scenario: Phase surface

- **WHEN** `/table` renders during a night or a day
- **THEN** the felt keeps its one tone and the dock names the phase in text

#### Scenario: One contour

- **WHEN** the rail and the felt render
- **THEN** both are stadium-shaped and the seats sit on their shared contour

#### Scenario: One glow

- **WHEN** the table renders in any phase
- **THEN** the stage carries at most one static centre glow and no looping glow

### Requirement: Step sheet decision hierarchy

The step sheet SHALL show one decision: a merged header with the actor and the
role, the ability once, and the chosen target only when one exists. Support
status, the allowed list, the host and player lines and the generic target
instruction SHALL stay inside the collapsed hints section or be absent; the
form SHALL NOT repeat the target instruction. The engine's blockers SHALL keep
the confirm control disabled.

**Source**: owner step-sheet reference (2026-11-16); `app/table-console` "Engine guidance and host safety"
**Tests**: `scripts/browser-check.ts`

#### Scenario: Merged header

- **WHEN** the host opens the step sheet
- **THEN** the actor and the role share one header block and the ability appears
  once below it

#### Scenario: Chosen target

- **WHEN** the host has chosen a target on the table and opens the sheet
- **THEN** the sheet names that target in a single row and shows no second
  "choose a target" instruction

#### Scenario: Blocked confirm

- **WHEN** the engine still needs a target, a given or a redirect
- **THEN** the confirm control stays disabled and the collapsed hints explain
  the requirement

### Requirement: Step sheet card

The step sheet SHALL render as one card with a single visible header; the
dialog's own title and description SHALL stay available to assistive technology
only. The host hints SHALL be collapsed by default and open on request.

**Source**: owner step-sheet reference (2026-11-16); `app/table-console` "Step sheet decision hierarchy"
**Tests**: `scripts/browser-check.ts`

#### Scenario: One card

- **WHEN** the host opens the step sheet
- **THEN** the sheet shows one card with the role header and no second visible
  dialog title

#### Scenario: Hints collapsed

- **WHEN** the sheet opens for a new host
- **THEN** the hints summary is collapsed and the actions fit in the card

## MODIFIED Requirements

### Requirement: Visible seats and role identity

Every seat SHALL show the player name at 360 to 390 px, the seat number where
space allows, and the role artwork on the medallion. The role text SHALL be
available in the player list, the step sheet and the player card. A seat SHALL
be a keyboard-reachable control with a target of at least 44x44 CSS pixels. Each
seat SHALL render as one identity block on the stadium contour: a round
medallion, the name and one compact status line. Labels SHALL sit inward on the
straight sides and outward on the caps so they stay inside the table box.

**Source**: [Issue #164](https://github.com/hose1021/grimoria/issues/164); owner reference images (2026-11-16); `design/prototypes/05-velvet-ring.html`
**Tests**: `scripts/browser-check.ts`, `src/ui/screens/table/helpers.test.ts`

#### Scenario: Fifteen names at 390

- **WHEN** a fifteen-player table renders at 390 px
- **THEN** all fifteen player names are visible on the table

#### Scenario: Role artwork

- **WHEN** a seat renders
- **THEN** its role artwork identifies the role and the role text is available
  in the player list and the player card

#### Scenario: Seat target

- **WHEN** the host uses the table with a keyboard or a touch screen
- **THEN** every seat is reachable, named, and at least 44x44 CSS pixels

#### Scenario: Identity block

- **WHEN** a seat renders on a phone
- **THEN** the medallion, the name and the status line stack inside the seat
  without overlapping a neighbour

### Requirement: Text state badges

Each seat SHALL show its states as coloured text badges under the role artwork:
acting, nominated, dead, ghost vote available or used, poisoned and protected.
The state SHALL NOT be conveyed by colour alone; the acting, nominated and dead
seats SHALL also differ by outline, mark or label. The table SHALL show only
states that are true, and the role-specific host tokens (red herring, butler's
master, spent ability) SHALL remain in the player card. Badges SHALL use the
table radius and SHALL NOT be pills. The acting seat SHALL carry the table
primary outline.

**Source**: [Issue #164](https://github.com/hose1021/grimoria/issues/164); owner reference images (2026-11-16); `design/prototypes/05-velvet-ring.html`
**Tests**: `scripts/browser-check.ts`

#### Scenario: Acting seat

- **WHEN** a night step has an actor
- **THEN** the actor's seat shows the acting text badge and the table primary
  outline

#### Scenario: Nominated seat

- **WHEN** a nomination is open
- **THEN** the nominee's seat shows the nomination text badge and the danger
  outline

#### Scenario: Dead and ghost vote

- **WHEN** a player dies
- **THEN** the seat shows the dead text badge and whether the ghost vote is
  still available

#### Scenario: Poison and protection

- **WHEN** a player is poisoned or protected
- **THEN** the seat shows the matching text badge and the state remains readable
  without colour

#### Scenario: Badge shape

- **WHEN** a seat badge renders
- **THEN** its computed corner radius is 4 px or less

### Requirement: Table theme tokens and visual scope

The table's felt surface, rail, action colours, parchment card and ink SHALL be
declared in the one `@theme` block before use, and the table tokens SHALL alias
the shared obsidian palette instead of restating its values. A value the redesign
needs SHALL be added there, not to a component or an inline style, and the token
policy check SHALL fail on an unused or sourced-less token. The table
composition SHALL apply to `/table` only; the shared palette SHALL apply to every
route. No second stylesheet and no new runtime dependency SHALL be introduced.

**Source**: [Issue #164](https://github.com/hose1021/grimoria/issues/164); `app/design-tokens` "One token source"; owner-selected Obsidian & Antique Gold direction
**Tests**: `scripts/check-types-policy.ts`; `scripts/browser-check.ts`

#### Scenario: Token source

- **WHEN** a table colour is used
- **THEN** its value is declared in the `@theme` block or aliases a shared token
  there, and the token policy check passes

#### Scenario: Other routes

- **WHEN** the palette is applied
- **THEN** no route other than `/table` changes composition, and every route
  reads the shared obsidian palette

#### Scenario: Unused addition

- **WHEN** the redesign declares a token that no class or rule uses
- **THEN** the token policy check fails and names the token

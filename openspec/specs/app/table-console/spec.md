# app/table-console Specification

## Purpose
Defines the Storyteller's table window: the seat ring and the state it carries,
the fixed action dock and the engine guidance it surfaces, the vote threshold
and dawn report, and the full-screen player card. The table is the primary
surface for reading and driving a game, on a desktop and a phone.

## Requirements

### Requirement: Scheduled deaths on the ring

The ring SHALL mark a seat whose death the engine has scheduled but not yet
resolved, SHALL distinguish that mark from a resolved death, and SHALL clear it
when the death resolves or is prevented.

**Source**: [Issue #170](https://github.com/hose1021/grimoria/issues/170); `SPEC.md` "Screens" (`/table`)
**Tests**: `src/core/engine/bmr.test.ts`, `src/ui/screens/table/helpers.test.ts`, `src/application/read-models/table.test.ts`, `scripts/browser-check.ts`

#### Scenario: Pending Pukka death

- **WHEN** a Pukka death is scheduled for the next resolution
- **THEN** the target's seat shows a scheduled-death mark and the seat stays
  alive until the engine resolves the death

#### Scenario: Prevented death

- **WHEN** the scheduled death is prevented or suspended
- **THEN** the mark clears and the seat shows no scheduled death

### Requirement: Zombuul registered death

When the Zombuul registers as dead while alive, the ring SHALL show a fake-death
state distinct from a real death, and the console SHALL warn before the next
execution that the registered body may still act.

**Source**: [Zombuul r3022](https://wiki.bloodontheclocktower.com/index.php?title=Zombuul&oldid=3022); [Issue #170](https://github.com/hose1021/grimoria/issues/170)
**Tests**: `src/core/engine/bmr.test.ts`, `src/ui/screens/table/helpers.test.ts`, `scripts/browser-check.ts`

#### Scenario: First Zombuul death

- **WHEN** a sober Zombuul dies for the first time
- **THEN** its seat reads as registered dead, not as a real death

#### Scenario: Before the next execution

- **WHEN** the host opens the execution control after a Zombuul registered death
- **THEN** the console warns that the body may still act and does not decide the
  execution automatically

### Requirement: Nomination readout after dawn

After the dawn report is dismissed, the ring centre SHALL show the active
nomination with its nominator, nominee and vote tally, or an explicit
no-nomination state. The dismissal control SHALL NOT promise to open a
nomination.

**Source**: [Issue #170](https://github.com/hose1021/grimoria/issues/170); `SPEC.md` "Screens" (`/table`)
**Tests**: `src/ui/screens/table/helpers.test.ts`, `scripts/browser-check.ts`

#### Scenario: No nomination yet

- **WHEN** the dawn report is dismissed before any nomination exists
- **THEN** the centre says that no nomination is open and offers no control that
  implies one can be opened from there

#### Scenario: Recorded nomination

- **WHEN** a nomination has votes
- **THEN** the centre names the nominator, the nominee and the current tally

### Requirement: Effect badge source

A seat's effect badge SHALL name the effect's source role or owner when the state
records one, and SHALL use a generic badge only when no source exists.

**Source**: [Issue #170](https://github.com/hose1021/grimoria/issues/170); `SPEC.md` "Screens" (`/table`)
**Tests**: `src/ui/screens/table/helpers.test.ts`, `src/application/read-models/table.test.ts`, `scripts/browser-check.ts`

#### Scenario: Sourced drunk state

- **WHEN** a Sailor or Courtier makes a player drunk
- **THEN** the badge names the source role and the affected player

#### Scenario: Sourceless state

- **WHEN** an effect has no recorded source
- **THEN** the badge uses the generic effect text and does not invent a source

### Requirement: Day help sheet

The day-help sheet SHALL contain only role-specific forms and SHALL NOT
duplicate the generic execution target, execution result or nomination controls
that the dock owns. Tapping a seat during the day SHALL open that player's
sheet, which may choose or clear the execution target; the dock SHALL remain
the only control that records the execution.

**Source**: [Issue #170](https://github.com/hose1021/grimoria/issues/170), [Issue #191](https://github.com/hose1021/grimoria/issues/191); `SPEC.md` "Screens" (`/table`)
**Tests**: `scripts/browser-check.ts`

#### Scenario: Virgin form

- **WHEN** the host opens the day-help sheet with the Virgin in play
- **THEN** the sheet shows the Virgin nomination form and no generic execution or
  nomination form

#### Scenario: Execution stays in the dock

- **WHEN** the host records an execution
- **THEN** the target was chosen in the player sheet, the dock control records it
  and the day-help sheet shows no execution control

#### Scenario: Day seat opens the sheet

- **WHEN** the host taps a seat during the day
- **THEN** the player sheet opens for that seat and offers select or clear for the
  execution target

### Requirement: Role decision sheets

The Gambler and Tinker sheets SHALL keep the role decision separate from the
death and revival marking list, SHALL give the Tinker an explicit decision
control, and SHALL NOT show adjacent seat controls with opposite effects.

**Source**: [Issue #170](https://github.com/hose1021/grimoria/issues/170); `SPEC.md` "Screens" (`/table`)
**Tests**: `scripts/browser-check.ts`, `src/core/engine/bmr.test.ts`

#### Scenario: Gambler guess

- **WHEN** the host records the Gambler's guess
- **THEN** the guess control is separate from the death and revival marking list

#### Scenario: Tinker decision

- **WHEN** the Tinker step is active
- **THEN** the sheet offers an explicit decision control and the marking list is
  not the only way to decide the death

### Requirement: Minion information card independence

The minion-information card's hide control SHALL close only the card, and the
step sheet and its confirm control SHALL stay available afterwards.

**Source**: [Issue #170](https://github.com/hose1021/grimoria/issues/170); `SPEC.md` "Screens" (`/table`)
**Tests**: `scripts/browser-check.ts`

#### Scenario: Hide the minion card

- **WHEN** the host hides the minion-information card
- **THEN** the step sheet remains open with its confirm control

#### Scenario: Confirm after hiding

- **WHEN** the host confirms the step after hiding the minion card
- **THEN** the step completes without reopening the card

### Requirement: Live nominations stay at the table

The day console SHALL offer exactly three actions: execute the selected player,
end the day without execution, and open day help. It SHALL NOT offer nomination
or vote entry. The vote threshold and an existing saved nomination SHALL stay
read-only. The day-help action SHALL show how many role forms the sheet
currently holds, and the dock SHALL NOT repeat the threshold or an execution
instruction the table already shows.

**Source**: [Issue #170](https://github.com/hose1021/grimoria/issues/170), [Issue #258](https://github.com/hose1021/grimoria/issues/258); `SPEC.md` "Screens" (`/table`)
**Tests**: `scripts/browser-check.ts`; `src/ui/screens/table/helpers.test.ts`

#### Scenario: Three day actions

- **WHEN** the day console renders
- **THEN** the dock shows execute, end day and day help, and no nomination or
  vote controls

#### Scenario: Day-help count

- **WHEN** the day holds one unused Virgin and no other role form
- **THEN** the day-help action reads one, and the sheet holds exactly that form

#### Scenario: Execution without app-side votes

- **WHEN** the host selects a living player and executes
- **THEN** the execution is recorded without entering a nomination or a vote
  list in the app

#### Scenario: Saved nomination stays read-only

- **WHEN** an imported or legacy save already carries a nomination
- **THEN** the hub shows it and its tally without offering an edit control

### Requirement: One undo control

The console SHALL expose one undo control in the fixed dock. The table menu
SHALL NOT repeat undo, and the local step-draft reset SHALL be labelled as
clearing the selection rather than as undoing a turn.

**Source**: [Issue #170](https://github.com/hose1021/grimoria/issues/170); `SPEC.md` "Screens" (`/table`)
**Tests**: `scripts/browser-check.ts`

#### Scenario: One dock control

- **WHEN** the console renders a night or day phase
- **THEN** the fixed dock carries the only undo control and the table menu has
  none

#### Scenario: Undo after a step

- **WHEN** the host skips a night step and activates the dock undo
- **THEN** the skipped step returns

#### Scenario: Draft reset label

- **WHEN** the host clears the target or answer draft
- **THEN** the control reads as clearing the selection, not as undo

### Requirement: Deal screen return action

The deal screen SHALL offer one return-to-table action with a single wording and
meaning, and SHALL NOT show two identically worded controls.

**Source**: [Issue #170](https://github.com/hose1021/grimoria/issues/170); `SPEC.md` "Screens" (`/table`)
**Tests**: `scripts/browser-check.ts`

#### Scenario: One return control

- **WHEN** the deal screen renders
- **THEN** exactly one control returns to the table and its label states that
  destination

#### Scenario: Return keeps the deal

- **WHEN** the host returns to the table from the deal screen
- **THEN** the dealt roles and the saved game are unchanged

### Requirement: Table window composition

`/table` SHALL render one host table window with a top bar, a table area and a
fixed action dock. At 720 px and above the table SHALL fit the stage. Below
620 px the table MAY be taller than the viewport: the table area SHALL scroll
vertically while the top bar and the dock remain in place and usable, and the
document SHALL NOT scroll horizontally at 360 to 390 px. The stage SHALL reserve
space for the seat labels so the dock does not cover a name or seat number.

**Source**: [Issue #164](https://github.com/hose1021/grimoria/issues/164), [Issue #311](https://github.com/hose1021/grimoria/issues/311); `design/prototypes/05-velvet-ring.html`; `SPEC.md` "Screens" (`/table`)
**Tests**: `scripts/browser-check.ts`

#### Scenario: Desktop table

- **WHEN** `/table` renders at 1440x900
- **THEN** the table area fits the viewport and the dock stays below it

#### Scenario: Phone labels

- **WHEN** a fifteen-player table renders at 390 px
- **THEN** the stage scrolls but no seat name or seat number sits under the dock

#### Scenario: Phone scroll

- **WHEN** a fifteen-player table is taller than the viewport at 390 px
- **THEN** only the table area scrolls and the top bar and dock remain fixed

#### Scenario: No sideways scroll

- **WHEN** `/table` renders at 360 and 390 px
- **THEN** the document has no horizontal overflow

#### Scenario: Phase control stays fixed

- **WHEN** `/table` renders at any width
- **THEN** the phase control lives in the fixed bar or dock and does not float
  over the scrolling table

### Requirement: Two-second table read

At 1440x900, `/table` SHALL show the phase and day, the living and dead counts,
the actor, the next action, the vote threshold and the nomination, and the state
of every seat without scrolling. At 360 to 390 px the same state SHALL be
available in the table stage and the fixed dock; the table area MAY scroll and
the dock SHALL stay fixed.

**Source**: [Issue #164](https://github.com/hose1021/grimoria/issues/164); `design/prototypes/05-velvet-ring.html`; `SPEC.md` "Screens" (`/table`)
**Tests**: `scripts/browser-check.ts`

#### Scenario: Desktop day

- **WHEN** a fifteen-player day opens at 1440x900
- **THEN** the phase, the nomination, the threshold, the dead seat and the
  execution control are visible without scrolling

#### Scenario: Desktop night

- **WHEN** a night step is active at 1440x900
- **THEN** the actor, the next action, the step progress and the resolve control
  are visible without scrolling

#### Scenario: Phone state

- **WHEN** `/table` renders at 360 to 390 px
- **THEN** the dock carries the actor and the next action and the table carries
  the state of every seat; only the table area scrolls

### Requirement: Visible seats and role identity

Every seat SHALL show the player name and the seat number at 360 to 390 px, and
the role artwork on the medallion. The name label SHALL be part of the seat
control's hit area. The role text SHALL be available in the player list, the
step sheet and the player card. A seat SHALL be a keyboard-reachable control
with a target of at least 44x44 CSS pixels. Each seat SHALL render as one
identity block on the stadium contour: a round medallion, the name and one
compact status line.

**Source**: [Issue #164](https://github.com/hose1021/grimoria/issues/164), [Issue #311](https://github.com/hose1021/grimoria/issues/311); owner reference images (2026-11-16); `design/prototypes/05-velvet-ring.html`
**Tests**: `scripts/browser-check.ts`, `src/ui/screens/table/helpers.test.ts`

#### Scenario: Fifteen names at 390

- **WHEN** a fifteen-player table renders at 390 px
- **THEN** all fifteen player names and seat numbers are visible on the table

#### Scenario: Name tap

- **WHEN** the host taps a seat name during a target step
- **THEN** the seat selects the target

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

#### Scenario: Labels stay inside the table box

- **WHEN** a seat sits on a straight side or a cap of the stadium contour
- **THEN** its label sits inward on the straight sides and outward on the caps
  so it stays inside the table box

### Requirement: Text state badges

Each seat SHALL show its states as coloured text badges under the role artwork:
acting, nominated, dead, ghost vote available or used, drunk, poisoned and
protected. A drunk and poisoned player SHALL show both states. The state SHALL
NOT rely on colour alone; the acting, nominated and dead seats SHALL also differ
by outline, mark or label. The table SHALL show only true states. Badges SHALL
use the table radius and SHALL NOT be pills. The acting seat SHALL carry the
table primary outline.

**Source**: [Issue #164](https://github.com/hose1021/grimoria/issues/164), [Issue #331](https://github.com/hose1021/grimoria/issues/331); owner reference images (2026-11-16); `design/prototypes/05-velvet-ring.html`
**Tests**: `scripts/browser-check.ts`, `src/application/read-models/table.test.ts`, `src/ui/screens/table/helpers.test.ts`

#### Scenario: Acting seat

- **WHEN** a night step has an actor
- **THEN** the actor's seat shows the acting text badge and the amber outline

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

#### Scenario: Drunk and poisoned

- **WHEN** a player is drunk and also poisoned
- **THEN** the seat shows the drunk badge and the poison badge, and neither true
  state hides the other

#### Scenario: Badge shape

- **WHEN** a seat badge renders
- **THEN** its computed corner radius is 4 px or less

#### Scenario: Host tokens stay in the card

- **WHEN** the player at a seat is the red herring, the butler's master or has
  spent their ability
- **THEN** that token appears in the player card and not as a seat badge

### Requirement: Vote threshold and execution result

The day SHALL display the execution threshold, `ceil(living / 2)`, in the centre
hub. The host SHALL record the votes; the execution control SHALL be unavailable
below the threshold. The table SHALL dispatch the existing command for execution
and the centre SHALL show the executed player and role afterwards. The engine
SHALL remain the authority for whether an execution is allowed; the screen
SHALL NOT compute a rule outcome locally.

**Source**: [Issue #164](https://github.com/hose1021/grimoria/issues/164), [Issue #258](https://github.com/hose1021/grimoria/issues/258); `game/day-and-win`; `SPEC.md` "Screens" (`/table`)
**Tests**: `scripts/browser-check.ts`; `src/core/engine/commands.test.ts`

#### Scenario: Threshold

- **WHEN** a nomination is open with fifteen living players
- **THEN** the hub shows that eight votes are needed

#### Scenario: Host records votes

- **WHEN** the host records a vote
- **THEN** the vote total and the threshold progress update and the execution
  control becomes available only at the threshold

#### Scenario: Execution result

- **WHEN** the host executes the nominee
- **THEN** the centre shows the executed player and role and the day can be
  closed

### Requirement: Dawn report

When a day starts, the centre of the table SHALL show the night's deaths with
the player name and role and the number of survivors, or state that nobody died
and everyone survived. The host SHALL be able to dismiss the report to the
nomination view. The report SHALL read the night deaths from the game state; the
engine SHALL remain the authority on deaths and the win state.

**Source**: [Issue #164](https://github.com/hose1021/grimoria/issues/164); `game/day-and-win`; `design/prototypes/05-velvet-ring.html`
**Tests**: `scripts/browser-check.ts`

#### Scenario: Night deaths

- **WHEN** a night ends with one death
- **THEN** the dawn report names the dead player and role and the survivor count

#### Scenario: No deaths

- **WHEN** a night ends without a death
- **THEN** the dawn report says that nobody died and everyone survived

#### Scenario: Dismiss

- **WHEN** the host dismisses the dawn report
- **THEN** the centre shows the current nomination state

### Requirement: Full-screen player card surface

The table SHALL provide a full-screen player card that hides the console, the
table, the dock and the chrome and shows only the information intended for the
player. The card SHALL NOT show host notes, the host's truth, other roles or
statuses not intended for the player. Closing the card SHALL return to the
console; focus SHALL move into the card when it opens and Escape SHALL close it.

**Source**: [Issue #164](https://github.com/hose1021/grimoria/issues/164); `app/ui-and-privacy` "Public and player privacy"; `design/prototypes/05-velvet-ring.html`
**Tests**: `scripts/browser-check.ts`

#### Scenario: Information card

- **WHEN** the host shows a night information card
- **THEN** the screen contains only that information and hides the console

#### Scenario: Close and focus

- **WHEN** the player card opens or the host closes it
- **THEN** focus moves into the card and Escape returns it to the console

### Requirement: Player card content and poisoned guard

The card SHALL present a role card, the night information, or a host-entered
false-information template. The Drunk's role card SHALL show the believed role
and its ability, not the Drunk role. For a poisoned or drunk player, the true
information card SHALL NOT be offered; only the template SHALL be available.

**Source**: [Issue #164](https://github.com/hose1021/grimoria/issues/164); `app/ui-and-privacy` "Public and player privacy"; `design/prototypes/05-velvet-ring.html`
**Tests**: `scripts/browser-check.ts`

#### Scenario: Drunk role card

- **WHEN** the host shows the card of a Drunk player
- **THEN** the card shows the believed role and its ability, not the Drunk role

#### Scenario: Poisoned player

- **WHEN** the information actor is poisoned
- **THEN** the true information card is unavailable and only the template is
  offered

#### Scenario: Host template

- **WHEN** the host enters a false-information template
- **THEN** the player card shows the role artwork and only the entered text

### Requirement: Engine guidance and host safety

The dock and the step sheet SHALL surface the engine's step guidance, the active
effects that touch the step, the mandatory decisions, the consequence preview,
the rejection reason and the Storyteller-choice reason required by
`app/ui-privacy`. The dock SHALL collapse an empty effect list and an empty
consequence preview into one short line rather than two labelled blocks. The
table SHALL dispatch the existing commands only and SHALL NOT auto-fill a
Storyteller choice.

**Source**: `app/ui-and-privacy` "Storyteller step explanation", "Consequence preview and separation", "Rejected command reason"; [Issue #164](https://github.com/hose1021/grimoria/issues/164), [Issue #311](https://github.com/hose1021/grimoria/issues/311)
**Tests**: `scripts/browser-check.ts`; `src/core/engine/commands.test.ts`

#### Scenario: Preview before confirm

- **WHEN** the host chooses a target and a consequence is pending
- **THEN** the dock shows the consequence before the host confirms

#### Scenario: Empty preview

- **WHEN** the step has no active effect and no consequence
- **THEN** the dock shows one short line and no empty labelled block

#### Scenario: Protected target

- **WHEN** the chosen target is protected from the current effect
- **THEN** the dock says the death or effect will be prevented before the host
  confirms

#### Scenario: Special consequence

- **WHEN** the engine reports the consequence as prevented or special
  (protection, Soldier, Mayor redirect or Saint execution)
- **THEN** the dock warns before the host confirms

#### Scenario: Rejection

- **WHEN** the engine rejects a command
- **THEN** the console shows the reason and the game state does not change

### Requirement: Table theme tokens and visual scope

The table's felt surface, rail, action colours, parchment card and ink SHALL be
declared in the one `@theme` block before use. A value the table needs SHALL be
added there, not to a component or an inline style, and the token policy check
SHALL fail on an unused or sourced-less token. The table composition SHALL
apply to `/table` and to the `/seat` ring; the shared palette SHALL apply to
every route.

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

#### Scenario: No second stylesheet or dependency

- **WHEN** the table is built
- **THEN** no second stylesheet and no new runtime dependency is introduced

### Requirement: Private day ability panels

The day card SHALL show an Artist panel while a living Artist has not asked the
question, and a Savant panel while a living Savant has not visited that day.
Both panels SHALL read the shared projections, SHALL offer only the answer and
truth options the command accepts, and SHALL dispatch `artistQuestion` or
`savantVisit` through the existing store action. The panels SHALL contain no
game rule.

**Source**: [Artist r3156](https://wiki.bloodontheclocktower.com/index.php?title=Artist&oldid=3156), [Savant r2910](https://wiki.bloodontheclocktower.com/index.php?title=Savant&oldid=2910); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/application/read-models/table.test.ts`, `src/core/engine/snv.test.ts`

#### Scenario: Artist panel

- **WHEN** a living Artist has not used the ability
- **THEN** the day card shows the question field, the yes/no/unknown answer and
  the record control

#### Scenario: Savant panel

- **WHEN** a living Savant has not visited today
- **THEN** the day card shows two statement fields and a truth select limited to
  the choices the projection returns

#### Scenario: Used ability

- **WHEN** the Artist has asked or the Savant visited today
- **THEN** the corresponding panel is absent and the stored private text stays
  in the Storyteller state

### Requirement: Abnormal ability marking panel

The table menu SHALL offer the ABNORMAL marking control during a day or night:
a player choice, a reason field, a record control and the current marks. It
SHALL dispatch `recordAbnormal` through the store action and SHALL contain no
game rule.

**Source**: [Mathematician r3153](https://wiki.bloodontheclocktower.com/index.php?title=Mathematician&oldid=3153); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Mark from the table

- **WHEN** the host opens the table menu during a day or night
- **THEN** the ABNORMAL panel offers the player list, the reason field and the
  record control, and lists the current marks

#### Scenario: Inactive phases

- **WHEN** the game is over or still in setup
- **THEN** the ABNORMAL panel is not offered

### Requirement: Lunatic player card uses the effective bluff selection

The first-night private Lunatic card SHALL display the Demon bluff list when
no separate Lunatic bluffs are chosen, and SHALL display the separate list
when it is nonempty. It SHALL preserve the existing concealment of the real
Demon's identity and the host's selected false Minions.

**Source**: [Lunatic r3112](https://wiki.bloodontheclocktower.com/index.php?title=Lunatic&oldid=3112), [Issue #256](https://github.com/hose1021/grimoria/issues/256)
**Tests**: `scripts/browser-check.ts`

#### Scenario: Empty default reaches the player

- **WHEN** the host shows the Lunatic's first-night card without selecting separate bluffs
- **THEN** the card shows all three real Demon bluffs and does not identify the real Demon

#### Scenario: Explicit override reaches the player

- **WHEN** a separate nonempty list is selected
- **THEN** the card displays that list instead of the Demon list

### Requirement: Lunatic night-one bluff card

The Lunatic's night-one card SHALL mirror the Demon's night-one card: the
Lunatic's own seat as the Demon they believe they are, the Minion players and
the bluffs. The Storyteller SHALL choose the Minion players and the app SHALL
NOT fill them in automatically. First-night picks SHALL NOT be recorded or
reported as an attack. The card SHALL NOT name the real Demon's player or the
real Minions.

**Source**: [Lunatic r3112](https://wiki.bloodontheclocktower.com/index.php?title=Lunatic&oldid=3112), [Issue #187](https://github.com/hose1021/grimoria/issues/187)
**Tests**: `src/core/engine/bmr.test.ts`, `scripts/browser-check.ts`

#### Scenario: Chosen Minions

- **WHEN** the host shows the Lunatic's night-one card after picking one player
  per Minion in play
- **THEN** the card uses the Demon card layout with the Lunatic's own seat and
  the picked players, plus the three bluffs

#### Scenario: No real Demon or real Minions

- **WHEN** the Lunatic's card is shown
- **THEN** it names neither the real Demon's player nor the real Minions

#### Scenario: First night is not an attack

- **WHEN** the first-night Lunatic step completes with the Minion picks
- **THEN** no death is recorded, no attack target is stored for later nights
  and the Demon's report does not name the picks

#### Scenario: Wrong number of Minions

- **WHEN** the host confirms the first-night Lunatic step without exactly one
  pick per Minion in play
- **THEN** the engine rejects the step

### Requirement: Current-script role correction choices

The role correction dialog SHALL offer the active script's characters and
SHALL persist an accepted correction through the existing command boundary.

**Source**: [Bad Moon Rising r2871](https://wiki.bloodontheclocktower.com/index.php?title=Bad_Moon_Rising&oldid=2871), [Sects & Violets r3127](https://wiki.bloodontheclocktower.com/index.php?title=Sects_%26_Violets&oldid=3127); `SPEC.md` manual corrections.
**Tests**: `scripts/browser-check.ts`

#### Scenario: Correct a BMR or Sects and Violets character

- **WHEN** the host opens role correction in either supported scenario
- **THEN** the dialog offers that script's roles and a valid choice persists

### Requirement: Step action readiness

The dock's night action SHALL be unavailable while the current step lacks its
target, and its label SHALL name the missing input instead of opening a sheet
whose confirm control is disabled. When the secret setup is incomplete, the
action SHALL offer the route to that setup instead of a disabled control. A
blocker the step sheet itself answers (information, role, drunk choice,
redirect) SHALL leave the action available so the sheet stays reachable.

**Source**: [Issue #311](https://github.com/hose1021/grimoria/issues/311); `app/table-console` "Engine guidance and host safety"
**Tests**: `src/ui/screens/table/helpers.test.ts`, `scripts/browser-check.ts`

#### Scenario: Blocked step

- **WHEN** a targeting step has fewer targets than the engine requires
- **THEN** the dock action is disabled and its label says that a target is
  needed, and no sheet opens

#### Scenario: Ready step

- **WHEN** every required input for the step is present
- **THEN** the dock action opens the step sheet and the sheet can confirm

### Requirement: Vote entry commits on leave

The day player sheet SHALL record the vote count when the host leaves the number
field or presses Enter, SHALL NOT require a separate save control, and SHALL not
dispatch when the value is unchanged or invalid.

**Source**: [Issue #311](https://github.com/hose1021/grimoria/issues/311); `app/table-console` "Vote threshold and execution result"
**Tests**: `scripts/browser-check.ts`

#### Scenario: Commit on blur

- **WHEN** the host types a valid count and leaves the field
- **THEN** the count is recorded and the field shows it as saved

#### Scenario: Invalid value

- **WHEN** the field holds an empty or out-of-range value
- **THEN** nothing is dispatched and the value stays editable

### Requirement: Execution confirmation

Execution SHALL require an explicit confirmation that names the player, seat
and role. The preview of the selected execution target SHALL read in the future
tense. The dock SHALL render one consequence preview per phase.

**Source**: [Issue #311](https://github.com/hose1021/grimoria/issues/311); [Issue #164](https://github.com/hose1021/grimoria/issues/164); `app/table-console` "Vote threshold and execution result"
**Tests**: `scripts/browser-check.ts`

#### Scenario: Confirm before death

- **WHEN** the host activates the execution control with a selected player
- **THEN** a confirmation sheet names the player, the seat and the role, and the
  game state changes only after its confirm control

#### Scenario: Cancel

- **WHEN** the host closes the confirmation sheet
- **THEN** the player stays alive and the selected target stays selected

#### Scenario: Stale selection

- **WHEN** another execution is recorded after the confirmation sheet opens
- **THEN** confirming the outdated selection is rejected and no second player
  is executed

### Requirement: Wake order visibility

The table menu SHALL show the night queue: completed and total steps, the next
three wakes and the full order, with the current step marked. The dock SHALL
name the next wake while a night step is active.

**Source**: [Issue #311](https://github.com/hose1021/grimoria/issues/311); `app/table-console` "Two-second table read"
**Tests**: `scripts/browser-check.ts`

#### Scenario: Next wake

- **WHEN** a night step is active
- **THEN** the dock names the next wake after the current step

#### Scenario: Full order

- **WHEN** the host opens the table menu during a night
- **THEN** the queue panel shows progress, the next three wakes and the order

### Requirement: Console text floor

Functional text the host reads under pressure on the console SHALL be at least
12 px: the phase chip, seat numbers, roster rows, journal title, filters and
entry details, and dock counters. Decorative micro-labels MAY stay smaller.

**Source**: [Issue #311](https://github.com/hose1021/grimoria/issues/311); `app/table-console` "Two-second table read"
**Tests**: `scripts/browser-check.ts`

#### Scenario: Phone console

- **WHEN** the console renders at 390 px
- **THEN** the phase chip, seat number, roster row and journal entry text render
  at 12 px or larger

### Requirement: Player bubble voting controls

Opening a player's bubble during the day SHALL offer a numeric vote tally.
A dead or registered-dead player's sheet SHALL also offer a spent-vote
control. Saved tallies and token state SHALL be visible on the table and
survive reload; all mutations SHALL use commands.

**Source**: [Issue #200](https://github.com/hose1021/grimoria/issues/200), [Rules Explanation r1310](https://wiki.bloodontheclocktower.com/index.php?title=Rules_Explanation&oldid=1310)
**Tests**: `scripts/browser-check.ts`

#### Scenario: Bubble tally and token

- **WHEN** the host saves a tally or changes a dead-vote marker from a player sheet
- **THEN** the bubble reflects the result after closing the sheet and after reload

### Requirement: Setup bluff and mask controls

The setup UI SHALL show only eligible Demon bluffs, SHALL show occupied good
characters in the separate Lunatic choices, and SHALL offer a shuffle action
for each list. The host SHALL be able to select a Lunatic mask explicitly or
resume following the real Demon. The Lunatic information card SHALL use its
own bluff list without automatically naming the real Demon.

**Source**: [Lunatic r3112](https://wiki.bloodontheclocktower.com/index.php?title=Lunatic&oldid=3112)
**Tests**: `scripts/browser-check.ts`

#### Scenario: Separate private card

- **WHEN** the host shows the Lunatic information card with an independent bluff list
- **THEN** it contains that list and chosen false Minions without the actual Demon's identity

#### Scenario: Phone controls

- **WHEN** the host edits bluffs, the mask or bubble votes at 390 pixel width
- **THEN** the controls remain usable without horizontal overflow

### Requirement: The host answers the Mayor redirect

Choosing the Mayor as the Demon's target from a seat SHALL leave the Mayor
redirect unanswered. The redirect select SHALL show its placeholder, the dock
and the step sheet SHALL name the missing answer, and the step SHALL stay
blocked until the host picks the Mayor's fate. A new victim SHALL reset the
answer to unanswered.

**Source**: [Mayor r2995](https://wiki.bloodontheclocktower.com/index.php?title=Mayor&oldid=2995) "If you die at night, another player might die instead."; `AGENTS.md` "Auto-fill a Storyteller decision (... Mayor redirect ...)"; `app/ui-shell` "Matching control state"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `scripts/browser-check.ts`

#### Scenario: The Imp chooses the Mayor

- **WHEN** at 390 px the host taps the healthy Mayor's seat on the Imp's step
- **THEN** the dock lists the redirect as missing, the sheet's redirect select is empty and its confirm is disabled, and after the host picks "the Mayor dies" the step completes and the Mayor dies

#### Scenario: The Demon changes its target

- **WHEN** the host answered the redirect, then taps another seat and the Mayor again
- **THEN** the redirect select is empty and the confirm is disabled

### Requirement: The Demon's heir leads the night

While the host owes the Demon's heir, the dock and the centre of the table SHALL
name that question, the dock SHALL offer the living Minions the engine lists,
and the table SHALL offer no control of a later step: no complete, skip, reset
or end of night, and no seat as a target. The step sheet SHALL show only the
question.

**Source**: [Imp r3116](https://wiki.bloodontheclocktower.com/index.php?title=Imp&oldid=3116) "How to Run": "If the Imp killed themself at night, choose an alive Minion ... Wake the new Imp"; `AGENTS.md` "Auto-fill a Storyteller decision (... Demon heir)"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `scripts/browser-check.ts`

#### Scenario: The Imp kills itself with two Minions alive

- **WHEN** at 390 px the Imp kills itself on night 2, the Fortune Teller's step comes next, and the Poisoner and the poisoned Scarlet Woman are alive
- **THEN** the dock and the centre of the table name the heir question, the dock offers both Minions and no step control, no seat is a target of the Fortune Teller's step, and a seat tap opens that player's correction

#### Scenario: A step sheet is open when the heir becomes owed

- **WHEN** at 390 px the host's step sheet is open and another window records the Imp's self-kill with the Poisoner and the poisoned Scarlet Woman alive
- **THEN** the sheet offers both Minions and no skip or confirm, and the host names the heir from it

#### Scenario: The host names the heir

- **WHEN** the host picks the Poisoner in the dock
- **THEN** the Poisoner becomes the Imp, the new Imp's wake is the current step, the dock offers its controls again, and after it the Fortune Teller's step opens with no target chosen

### Requirement: An information answer is labelled by its reason

The select of a host-chosen information answer SHALL be labelled false
information when the actor is drunk or poisoned or a Vortox falsifies it, the
Storyteller's answer when its data source is missing, and a registration
otherwise, because a working ability then offers several answers only through
a player who may register either way.

**Source**: [Chef r2510](https://wiki.bloodontheclocktower.com/index.php?title=Chef&oldid=2510) Example 4; `docs/rules-matrix.md` TB-CHEF-02, SYS-EFFECTS-01; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/ui/screens/table/helpers.test.ts`, `scripts/browser-check.ts`

#### Scenario: A healthy Chef beside a Spy

- **WHEN** the Chef sits beside the Spy, who sits beside the Imp, and the host opens the Chef's step at 390 px
- **THEN** the count select is labelled as a registration, not as false information

#### Scenario: The other reasons

- **WHEN** the actor is drunk or poisoned, a Vortox falsifies a healthy answer, or a missing day makes the answer the Storyteller's
- **THEN** the label is false information, false information or the Storyteller's answer respectively

### Requirement: Setup board on the table

While the game is in its setup, deal or seat phase, `/table` SHALL show a setup
board instead of the table ring. The board SHALL name the four setup steps in
order — roles, names, seats, secrets — SHALL mark the current step and every
completed step with a text or shape cue, and SHALL offer exactly one primary
action for the current step.

**Source**: owner redesign request for the `/table` setup phase, 2026-11-18; `SPEC.md` "Screens" (`/table`)
**Tests**: `scripts/browser-check.ts`

#### Scenario: Roles step

- **WHEN** `/table` renders in the setup phase before roles are chosen
- **THEN** the board marks the roles step as current and its primary action opens
  `/bag`

#### Scenario: Names step

- **WHEN** the game is dealt and at least one player has not claimed a name
- **THEN** the board marks the names step as current and its primary action opens
  `/player`

#### Scenario: Seats step

- **WHEN** every player has claimed a name and the phase is still the deal phase
- **THEN** the board marks the seats step as current and its primary action opens
  `/seat`

#### Scenario: Secrets step

- **WHEN** the game is in the seat phase
- **THEN** the board marks the secrets step as current, offers the first-night
  action as its primary action, and keeps that action disabled while the secrets
  projection reports an error

### Requirement: Setup board seat roster

The board SHALL show one chip for every seat in the saved order, carrying the
seat number and either the claimed name or an unclaimed label. A claimed seat
SHALL also carry a claim mark, so the state reads without colour. The board
SHALL count claimed seats against the roster size and SHALL keep the
do-not-discuss-roles caution visible while roles are dealt.

**Source**: owner redesign request for the `/table` setup phase, 2026-11-18; `SPEC.md` "Screens" (`/table`)
**Tests**: `scripts/browser-check.ts`

#### Scenario: Mixed claims

- **WHEN** eight seats exist and three players have claimed names
- **THEN** the board shows eight chips in seat order, three names, five unclaimed
  labels and a count of three out of eight

#### Scenario: Long name

- **WHEN** a claimed name is longer than its chip
- **THEN** the chip truncates the name and the seat number stays readable

#### Scenario: Caution after the deal

- **WHEN** roles are dealt and the first night has not started
- **THEN** the board shows the do-not-discuss-roles caution

### Requirement: Setup board carries no secret

The setup board SHALL read only the seat order, the seat number, the claimed
name and the claim flag. It SHALL NOT show a role, a shown role, a team, a note
or any other secret, so the host can leave it open while the device is passed
to the players.

**Source**: `app/ui-and-privacy` "Public and player privacy"; owner redesign request for the `/table` setup phase, 2026-11-18
**Tests**: `scripts/browser-check.ts`

#### Scenario: Handoff exposure

- **WHEN** the device is handed to a player during the deal
- **THEN** the board shows no role, shown role, team or note for any seat

#### Scenario: Ready state

- **WHEN** the board passes through every setup step
- **THEN** no secret value from the game state reaches the board markup

### Requirement: Setup board fits a phone

At 360 to 390 px the setup board SHALL fit the stage width without horizontal
document scroll, SHALL keep every control at least 44x44 CSS pixels, and SHALL
scroll vertically inside the stage when its content is taller than the
viewport, leaving the app bar and the dock in place.

**Source**: owner redesign request for the `/table` setup phase, 2026-11-18; `SPEC.md` "Screens" (`/table`)
**Tests**: `scripts/browser-check.ts`

#### Scenario: Phone fit

- **WHEN** `/table` renders the board at 360 and 390 px
- **THEN** the document has no horizontal overflow and every board control is at
  least 44 px tall

#### Scenario: Short viewport

- **WHEN** the board is taller than the stage at 360x640
- **THEN** the stage scrolls and the app bar and dock stay in place

### Requirement: One draft for a false information answer

The step sheet, the private information card and the command SHALL read one
draft for a drunk or poisoned actor's answer: the selected character or value,
the two players and the Storyteller's wording. The card SHALL show the answer
the command sends, and after completion SHALL show the recorded answer, not the
engine's computation or a poisoning label. A target change or a completed step
SHALL clear the draft.

**Source**: [Washerwoman r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630); [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); [Issue #217](https://github.com/hose1021/grimoria/issues/217); `SPEC.md` "Screens" (`/table`)
**Tests**: `src/ui/screens/table/helpers.test.ts` "an impaired actor card shows the chosen answer and its wording", `src/ui/screens/table/helpers.test.ts` "applyGiven keeps the Storyteller's wording in the same answer", `scripts/browser-check.ts`

#### Scenario: Wording, role and players in one answer

- **WHEN** the host types a false wording, chooses a Townsfolk and chooses two players for a poisoned Washerwoman
- **THEN** the card previews that wording, character and pair, and the command sends the same values

#### Scenario: After confirmation

- **WHEN** the step is confirmed and the draft is cleared
- **THEN** the card and the journal read the recorded answer, not the engine's prepared one

#### Scenario: A new target

- **WHEN** the host changes a target on a step that takes targets
- **THEN** the answer draft and its wording are cleared

#### Scenario: Privacy

- **WHEN** a poisoned actor's card is shown before or after confirmation
- **THEN** it contains no computed answer and no poisoning label

### Requirement: A false one-of-two answer offers both players

A one-of-two answer that asks the host SHALL offer both players beside the
role, so the Storyteller can name a pair other than the prepared one. The pair
SHALL be part of the same draft as the role and the wording, and SHALL reach
the card, the command, the journal and the reloaded game.

**Source**: [Washerwoman r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630); [Issue #217](https://github.com/hose1021/grimoria/issues/217); `SPEC.md` "Screens" (`/table`)
**Tests**: `scripts/browser-check.ts`

#### Scenario: A chosen pair

- **WHEN** the host chooses a role and two players other than the prepared pair
- **THEN** the card previews that role and pair and the command records them

#### Scenario: After confirmation and reload

- **WHEN** the confirmed answer is read in the journal and after a reload
- **THEN** the journal names the chosen character and both players, and the saved step keeps the pair

#### Scenario: A healthy answer

- **WHEN** the Washerwoman is sober and healthy
- **THEN** the step offers no pair control and keeps the prepared pair

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

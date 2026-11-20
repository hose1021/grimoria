# Spec Delta

## MODIFIED Requirements

### Requirement: Material and palette roles

The interface SHALL use the store surface scale: tube black for the page, shelf
black for panels, bone print, rental yellow for the one active or primary action
in a view, rent red for danger and death, signal blue for the forward path on the
same task, and cult purple only to separate the third script. Role and rules
reading MAY use the cream label material; the player card uses the parchment card
token. Team colours SHALL appear as tape spines or small marks, never as large
surface fills. No screen SHALL use a multi-colour decorative gradient or a
zero-offset colour halo.

**Source**: owner-pinned store direction; issue #384; `DESIGN.md`
**Tests**: `scripts/browser-check.ts`

#### Scenario: Primary action uses amber

- **WHEN** a phase panel shows its primary action
- **THEN** that action uses the rental-yellow treatment and no other control on
  the panel uses the same treatment

#### Scenario: Table primary action

- **WHEN** `/table` shows its primary action
- **THEN** that action uses the table primary token and no other control on the
  dock uses that treatment

#### Scenario: Danger uses crimson

- **WHEN** the console offers an execution or another destructive action
- **THEN** only that action and the loss marks use the rent-red treatment

#### Scenario: No decorative gradient

- **WHEN** any route renders
- **THEN** no full-page or card background uses a multi-colour gradient; the
  hazard stripe is a two-colour material, never a background for text

#### Scenario: Player card parchment

- **WHEN** the player card is shown on `/table`
- **THEN** it uses the parchment card token for the information it shows

#### Scenario: Seat ring surface

- **WHEN** `/seat` shows the seat ring
- **THEN** the rail and felt use the table surface tokens and no amber hexagon

#### Scenario: Team colour is a spine

- **WHEN** a role appears on a tape
- **THEN** its team colour appears as the spine strip, not as the card fill

### Requirement: Typography and shape

Titles, phase names, role names and tape titles SHALL use the Oswald display
face. Interface prose SHALL use Golos Text. System tags, shelf labels, barcodes
and step rails SHALL use PT Mono. Numerals in changing counts SHALL be tabular.
Corners SHALL be between 2 and 6 pixels, and controls SHALL NOT be pill-shaped
except state dots.

**Source**: owner-pinned store direction; `SPEC.md` "CSS and accessibility";
issue #384; `DESIGN.md`
**Tests**: `scripts/browser-check.ts`

#### Scenario: Type scale

- **WHEN** the console renders page titles, section titles, card titles, body
  copy, captions, service labels and buttons
- **THEN** they are 24-28 px, 20 px, 16 px, 13-14 px, at least 12 px, 11-12 px
  and 13-16 px respectively

#### Scenario: Phase title

- **WHEN** the console shows the current phase
- **THEN** the phase name renders in the Oswald display face

#### Scenario: Sharp controls

- **WHEN** a button, input or panel renders
- **THEN** its computed corner radius is at most 6 pixels and it is not a pill

#### Scenario: Table controls

- **WHEN** a `/table` dock control, state badge, phase control or player card
  renders
- **THEN** it uses the store radius and shape token

#### Scenario: System tag

- **WHEN** a shelf label, step rail or barcode caption renders
- **THEN** it uses PT Mono

### Requirement: Motion is state feedback only

Motion SHALL be limited to state feedback and transitions of 180 milliseconds or
less, with one exception: the welcome shelf MAY use one entrance of at most
460 milliseconds that ends with the content visible, staggered per tape. Under
`prefers-reduced-motion: reduce` no entrance, transition or animation SHALL run.
Entrance choreography SHALL NOT be used on any other surface.

**Source**: `SPEC.md` "CSS and accessibility"; owner-pinned store direction; issue #384
**Tests**: `scripts/browser-check.ts`

#### Scenario: Reduced motion

- **WHEN** the user requests reduced motion
- **THEN** no animation or transition runs and the welcome shelf is visible

#### Scenario: Active actor

- **WHEN** the active actor changes
- **THEN** the change is conveyed by a static highlight and an optional short
  transition, not by a looping animation

#### Scenario: One entrance

- **WHEN** the welcome page first renders
- **THEN** only the shelf tapes animate in, and every other surface is visible
  immediately

# Pocket Grimoire: five view designs

Research and five alternative view systems for the live game page. Every prototype uses the same demo game, so the differences are information architecture, not content.

Pocket Grimoire is a Storyteller aid. The host runs the bag, seat order and night order. Players only see their own role when the device is handed to them; nothing is shared online.

Open `prototypes/index.html` for the hub, or run a static server from the repo root and visit `/design/prototypes/`.

## What was reviewed

- Current page: `templates/index.gohtml`, `partials__setup`, `partials__grimoire`, `partials__night-order`, `partials__jinxes`, `partials__info-tokens`, `partials__notes`, `partials__setup__character-sheet`.
- Design constraints: `README.md` (single Go binary, no database, webpack assets), `web/css/theme.css`, role tokens in `web/build/img/roles` (400x400 transparent WebP, drawn for a dark surface).
- Comparable tools: [BotC Grimoire](https://botcgrimoire.com/), [BOTC Townsquare](https://botc.town/), [tiny-grimoire](https://github.com/bjageman/tiny-grimoire), [Pocket Grimoire](https://www.pocketgrimoire.co.uk/en_GB/).

The common pattern is seats, role tokens, reminder tokens, night order, death and shroud. None of them make the night order and the board the same surface.

## Findings

1. Setup and play share one long page. Seven accordion sections encode features, not the Storyteller's task.
2. Setup is open on load, so the grimoire board starts below the fold.
3. The night order is a separate accordion. During the night the Storyteller scrolls between it and the board.
4. There is no phase state or event history. Nothing records which wakes resolved, who was poisoned, or what changed when.
5. There is no way to hide the screen while a player takes the phone.
6. Notes, jinxes and info tokens are below the board, not reachable during a wake.
7. The board is drag-first. The valuable state (alive, shroud, reminders) is visual only and hard to query.
8. The only player-facing moment is the setup bag draft (`character_choice`, `character_decision`). After setup there is no private role card, no cover screen and no auto-hide, so players must remember what they were shown.

## Shared data model

All five concepts operate on the same model, so the Go handlers do not need five schemas:

- **Seat**: number, player name, role, team, alive, shroud, reminders.
- **Shown role**: the token the player was shown, which can differ from the real role (Drunk, Lunatic). Player UI reads this, never the Storyteller truth.
- **Phase**: Night N or Day N.
- **Wake**: role, instruction, done flag, ordered per night.
- **Event log**: append-only record of wakes, votes, deaths, notes.
- **Attachments**: demon bluffs, Storyteller notes, info tokens.

## The five directions

### 01 Round Table

**Thesis:** the board is the physical table. Seats sit in a ring, the selected player opens in the middle, and the night order is a docked wake queue.

- Layout: ring of eight tokens, central inspector, bottom step rail, notes and full night order in sheets.
- Signature: the ring and the reminder badges attached to seats.
- Strong at: spatial memory and quick selection on a tablet flat on the table.
- Cost: the ring wastes space on narrow screens, so mobile collapses to a seat list; reminders are less visible than on cards.
- Dials: ENERGY 2, RHYTHM 2, MOTION 1. Dark slate palette because the room is dim and the art is drawn for dark. Amber is the only accent, reserved for selection and the active phase.

### 02 Workbench

**Thesis:** a three-pane tool. The rail finds a seat, the canvas edits the board, the inspector shows details.

- Layout: seat rail, token grid, Role/Reminders/Notes inspector, status bar, night order drawer, bluffs bar.
- Signature: the inspector, which keeps search, edits, reminders and notes beside the board instead of below it.
- Strong at: laptop or large tablet, long games, rapid edits, finding a player by name.
- Cost: densest shell; needs a real responsive collapse to stay usable on a phone.
- Dials: ENERGY 2, RHYTHM 2, MOTION 1. Graphite surfaces, mint accent for selection and focus, semantic team dots only where team matters.

### 03 Chronicle

**Thesis:** the game is a record. Every wake, vote and death is an entry in phase order.

- Layout: sticky seat roster and current-night checklist, timeline of phase groups, inline composer, notes panel.
- Signature: the phase spine with N/D medallions; resolved entries in oxblood, pending entries marked by a dot.
- Strong at: reviewing a game, finding contradictions, writing notes, printing a round report.
- Cost: slower than a board for live edits, and the current state is split between the roster and the timeline.
- Dials: ENERGY 1, RHYTHM 3, MOTION 1. Paper surface and serif display because the artifact is a written record. Oxblood is the single accent and doubles as the resolved mark.

### 04 Ledger

**Thesis:** the grimoire is a table of seats. Optimize for scanning and correcting state.

- Layout: summary strip, filter toolbar, dense table, side editor, night order drawer, full-screen privacy mode.
- Signature: privacy mode, which hides the entire grimoire before a player takes the device.
- Strong at: many players, fast comparisons, correcting deaths, reminders and notes.
- Cost: no spatial sense of the table; role art is reduced to a row thumbnail.
- Dials: ENERGY 1, RHYTHM 1, MOTION 1. Near-black instrument panel, orange accent inherited from the product, tabular numerals for scan speed.

### 05 Focus

**Thesis:** one player card, one hand, one decision at a time.

- Layout: phone card stack, progress segments, seat dots, previous/next controls, night checklist and notes in sheets.
- Signature: single-card navigation with arrow keys or taps; the night order is a step sheet, not a wall of text.
- Strong at: phone in hand during the night, quick edits between wakes, no accidental taps nearby.
- Cost: poor overview; comparing two players takes several moves, and a table needs a second surface for the big picture.
- Dials: ENERGY 2, RHYTHM 1, MOTION 2. Deep ink-green because the device is used in low light; absinthe accent marks the active wake and current seat.

## The bag

The first setup screen. Prototype: `prototypes/bag.html`.

- **Host picks the roles**: every Trouble Brewing role is on the page. Tap a role to add or remove it. Selected roles carry an `IN` mark; unselected roles stay dim.
- **Live counts**: each team shows selected / required. Required counts follow the player count. If Baron is selected, the requirement shifts by 2 Townsfolk to 2 Outsiders.
- **Legal bag**: one Demon, exact team counts, no duplicates. The status line names what is missing, and Deal stays disabled until the bag is legal.
- **Auto-fill / Clear**: draw a legal random bag, or empty the selection and pick from scratch.
- **Demon bluffs**: three selects. Options are roles not in the bag; a role already used in another bluff is disabled.
- **Drunk**: when the Drunk is selected, choose the shown Townsfolk from roles not in play.
- **Deal**: writes role ids into the game state, resets deaths, shrouds, reminders and claims, clears notes, starts Night 1 and builds the first-night wake order. The button asks for a second click before it overwrites a game.
- **Role data**: abilities, teams, wake numbers and art come from `web/build/data/en_GB.js`, the same payload the app already ships.

## Seat setup

The Storyteller arranges the table before the first night. Prototype: `prototypes/seat-setup.html`.

- **Ring of seats**: seat 1 at the top, numbering clockwise. Neighbours are adjacent numbers, so the ring is the data. This matters for Empath, Chef, Fortune Teller herrings and every "next to" ability.
- **Drag in**: drag a name from "Not seated" onto a seat. Dropping onto an occupied seat sends its occupant back to the tray.
- **Drag to swap**: drag one occupied seat onto another to swap the two players.
- **Drag out**: drag a seat onto the tray to unseat that player.
- **Tap fallback**: tap a name, then a seat, does the same without a drag. Escape cancels. Every seat and chip is a button, so the flow works from the keyboard.
- **Undo, Shuffle**: undo covers every move; shuffle fills the ring for a quick arrangement.
- **Use this order**: enabled only when every seat is filled. It saves the order and opens the grimoire.

The ring shows names only. Roles are assigned by the bag, not by seat setup, and never appear on this screen.

## Game state and GitHub Pages

`prototypes/store.js` keeps one game state object in `localStorage` under `pg.game.v1`:

- `order`: player ids in seat order.
- `players`: per id, the name, alive, shroud, reminders, claimed flag, `roleId` and `shownRoleId`.
- `scriptId`, `bluffs` (role ids), `notes`, `night`, `nightOrder`, `log`.

Every view hydrates the object on load and saves it after every mutation. Deaths, shrouds, reminders, names, notes, resolved wakes and new log entries survive reloads and appear in all prototypes, not just the one that changed them. Reset demo removes the object.

There is no backend and no database. That matches GitHub Pages:

- Static files only; all state lives in the visitor's browser.
- One game per browser profile and origin. No cross-device sync and no shared game between people.
- Clearing site data deletes the game. Export and import are the next step if moving a game is needed.
- Pages puts every path under one origin, so the views share storage automatically.

For local preview, serve over HTTP so the pages share one origin: `python -m http.server 8010`. Opening the files directly can isolate storage per file.

The current Go server cannot run on GitHub Pages. A Pages build must be static, with client-side state; the prototypes already follow that model.

Deployment paths: the prototypes load role art from `web/build/img/roles` and the Inter font from `web/fonts/inter`. Publish the repo root, or copy those folders into the Pages root. A production build should bundle them instead.

## Player-facing mode

The Storyteller device is the source of truth. A player only needs their own card, never the grimoire. The companion prototype is `prototypes/player-view.html`.

- **Number picker**: seats are numbers 1 to N in the saved seat order. No names and no roles appear until a number is tapped. Taken numbers dim and show the name that was entered.
- **Tap a number**: the role card opens directly. The number itself is the cover, so there is no extra confirmation screen.
- **Name entry**: the card carries a name field. Save and hide writes the name to that seat, and the number becomes taken.
- **Auto-hide**: 45 seconds, Save, Escape (cancels the pick), or switching the tab away (keeps the seat taken). The card never stays visible after the phone leaves the player's hand.
- **No Storyteller reminders**: poison, protection and "thinks" markers are grimoire state. Players are not told they are poisoned or drunk.
- **Shown role, not real role**: the card reads `shownRole`, `shownTeam` and `shownAbility`. In the demo Eve is the Drunk and sees a Butler card. The Lunatic, Spy and similar cases use the same field.

The Storyteller assigns roles to seat numbers before handing the phone over. The player flow writes names only; it never displays another seat's role.

## Comparison

| Concept | Main object | Device | Best at | Fails at |
|---|---|---|---|---|
| Round Table | Seat in space | Tablet on the table | Spatial recall, selection | Narrow screens, overview |
| Workbench | Board plus inspector | Laptop, large tablet | Editing, search, long games | Small phones |
| Chronicle | Event in time | Laptop, print | Review, notes, contradictions | Fast live edits |
| Ledger | Row of state | Tablet, laptop | Scanning, correcting, privacy | Table feel, art |
| Focus | Current player | Phone | One-hand play, night steps | Comparison, overview |

## Recommendation

Use **Workbench** as the shell for tablet and desktop, and develop **Focus** as its phone layout rather than a separate product. Add the **Chronicle log** as a fourth inspector tab: it answers "what happened" without leaving the board. Take the **privacy mode** from Ledger and make it global. Keep **Round Table** as an optional table view for a second screen or a projected display.

Open the **player role card** from a seat action, not as a separate page. It should be the same overlay on every device, and it should be the only screen a player ever sees.

The first change to ship, independent of concept, is phase state plus the event log. Four of the five concepts need it, and it turns the night order from a reference into a checklist.

## Prototype notes

- Files: `bag.html`, `round-table.html`, `workbench.html`, `chronicle.html`, `ledger.html`, `focus.html`, `seat-setup.html`, `player-view.html`, shared demo state in `data.js` and `store.js`.
- Use: open the hub. Every control works: bag draw and deal, seat drag and swap, undo, shuffle, seat selection, dead and shroud toggles, reminders, night checklists, notes, filters, search, privacy, composer, sheets, the player pass flow and its auto-hide. Escape closes overlays or cancels a selection.
- Demo data: Trouble Brewing, 8 players, Night 3. Eve is the Drunk and the player view shows her the Butler. Seat setup starts with five seated and three waiting when no saved game exists. Reload keeps the whole game state; Reset demo clears it.
- Not covered: night advance and other-night order, travellers and fabled, homebrew scripts, i18n and RTL, print sheet, export and import of the stored game.
- Checked: Chromium at 1440x960 and 390x844, no horizontal overflow, no console errors, every control exercised once, including manual role picking, Baron counts, bluff selects, the Drunk shown select, bag draws for 5, 8 and 12 players, seat drag, swap, unseat, undo, shuffle, the number-first role flow and state persistence across all prototypes.

# Spec Delta

## ADDED Requirements

### Requirement: Console opens directly after a private route

`/table` SHALL render the console immediately when it opens after `/player` or
`/public`. The console SHALL expose no hide control, no cover screen, no reveal
control and no warning step, and the route SHALL open no overlay of its own.
Mounting the console SHALL NOT dispatch a command or change the saved game.

**Source**: `SPEC.md` "Screens" (`/table`); issue #150
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Host returns from the player handoff

- **WHEN** the host leaves `/player` for `/table`
- **THEN** the console shows the phase card, and no `[data-act="hide"]`,
  `[data-act="reveal"]` or `[aria-modal="true"]` element exists

#### Scenario: Return from the public screen

- **WHEN** the public screen opens `/table`
- **THEN** the console renders without an intermediate cover and the grimoire
  controls are usable immediately

#### Scenario: Saved game unchanged

- **WHEN** a private route opens `/table`
- **THEN** the saved game and its revision are the same as before the route
  change

## MODIFIED Requirements

### Requirement: Setup routes open without a cover

After `/player` or `/public`, `/bag`, `/seat`, `/secrets` and `/table` SHALL
render directly. The shell SHALL NOT place a cover screen, a warning step or an
extra confirmation between a private route and a setup route, and SHALL NOT
place one between a private route and the console.

**Source**: `SPEC.md` "Screens" (`/player`); issues #142 and #150
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Player handoff to the bag

- **WHEN** the player handoff opens `/bag` after `/player`
- **THEN** the bag renders without a cover heading or a return control

#### Scenario: Browser back from the handoff

- **WHEN** the browser back button returns from `/player` to `/bag`
- **THEN** the bag renders without a cover heading or a return control

#### Scenario: Table overlay unchanged

- **WHEN** `/table` opens after `/player` or `/public`
- **THEN** the console renders without a cover heading, a warning step or a
  reveal control, and the setup routes keep their uncovered rendering

## REMOVED Requirements

### Requirement: Hidden console after a private route

**Reason**: The owner removed the hide overlay. It guarded nothing: its only
control revealed the console, and it opened behind every return from `/player`
and `/public`, so it cost the host one tap without protecting any content.

**Migration**: "Console opens directly after a private route" states the new
result for `/table`. The "Escape closes every overlay" behaviour survives in the
console requirements that own the remaining information, grimoire, role card,
correction, export and import overlays.

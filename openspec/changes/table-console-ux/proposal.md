# Proposal

Issue: https://github.com/hose1021/grimoria/issues/311

## Why

A dual-agent UX critique of the `/table` console found one blocking defect and
several friction defects, measured at 390x844 and 1440x900 with real games.

The night primary action opens the step sheet even when the step still has
unanswered blockers. The sheet covers the ring and its confirm control is
disabled, so the host must close it, pick a target and open it again on every
targeting step. The dock spends a third of the phone viewport on zero-state
blocks while the seat labels below the ring are clipped. Execution records on
one tap, with a preview written in the past tense. The wake order exists in
`QueuePanel` but is mounted nowhere. Functional text on the journal, roster and
phase chip is smaller than a dim room allows, and the largest visible seat
target, the name, does not respond.

## What Changes

- The night primary action is unavailable while the step has blockers, and
  names what is missing; it never opens a sheet that cannot be confirmed.
- Steps that need no information card complete from the dock in one action.
- The dock collapses zero-state effect and preview blocks into one line, renders
  one preview, and keeps the day instruction in the day-help sheet.
- Execution asks for confirmation in a sheet that names the player, seat and
  role, and the preview reads in the future tense.
- The table menu mounts the wake-order panel: upcoming wakes, progress and the
  full night order.
- Seat numbers show at every width and the name label is part of the seat
  control; the ring reserves space for labels above the dock.
- Functional console text is at least 12 px on the surfaces the host reads
  under pressure.
- Copy and locale: the dead count uses the correct plural, journal times follow
  the UI language, the setup primary names its destination, and the day-help
  count reads as a count.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/table-console`: step action readiness, execution confirmation, dock
  budget, wake-order visibility, seat hit area and numbers, console text floor.
- `app/ui-shell`: the setup board primary names its destination.

## Impact

- UI: `src/ui/screens/table/dock.tsx`, `ring.tsx`, `ring.ts`, `dialogs.tsx`,
  `cards.tsx`, `frame.tsx`, `index.tsx`, `helpers.ts`, `styles.ts`,
  `src/ui/components/arcane/event-log.tsx`, `src/ui/screens/bag.tsx`,
  `src/ui/i18n/locales/{ru,en,az}.ts`, `css/app.css`.
- Regression harness: `scripts/browser-check.ts`.
- No engine, state schema, storage key, route or projection change.
- Out of scope: a day nomination panel, the seat-tap correction behaviour and the
  roster's role exposure. The pinned specs own those behaviours and a change
  needs an owner decision.

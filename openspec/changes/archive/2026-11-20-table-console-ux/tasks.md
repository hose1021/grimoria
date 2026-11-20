# Tasks

## 1. Step action readiness

- [x] 1.1 Disable the dock step action while the step waits for a target; name
  the target in the label and title; offer the secrets route when setup is
  incomplete.
- [x] 1.2 Pure helper `blockerActionText` with a unit test.
- [x] 1.3 Browser check: a targeting step with no target shows a disabled action
  and opens no sheet.
- [x] 1.4 Browser check: a ready targeting step opens a sheet that confirms and
  advances the wake.

## 2. Dock budget and stage space

- [x] 2.1 Collapse empty effect and preview blocks into one line; hide an
  applied-only preview.
- [x] 2.2 Render one consequence preview on the day phase.
- [x] 2.3 Move the day instruction to the table menu and show the execution
  target in the dock hint.
- [x] 2.4 Size the ring to the stage with a 400 px floor, reserve label space,
  and show the seat number at every width.
- [x] 2.5 Make the seat name label part of the seat control.

## 3. Execution confirmation

- [x] 3.1 Add the `execute` overlay with target, seat, role and a future-tense
  preview.
- [x] 3.2 Route the dock control through the overlay; cancel keeps the target.
- [x] 3.3 Update every browser check that executes a player.
- [x] 3.4 Browser check: a confirmation left open while another execution is
  recorded rejects the stale selection and executes nobody else.

## 4. Wake order

- [x] 4.1 Mount `QueuePanel` in the table menu and localize its strings.
- [x] 4.2 Name the next wake in the dock step line.

## 5. Vote entry

- [x] 5.1 Commit the vote count on blur and Enter; remove the save control and
  defer the blur commit so the tap that caused it is not swallowed.
- [x] 5.2 Browser check: typing a count and pressing Enter records it; an
  out-of-range count does not.

## 6. Typography and copy

- [x] 6.1 Apply the 12 px floor to the phase chip, seat numbers, roster, journal
  and setup steps.
- [x] 6.2 Fix the dead-count counters, journal timestamps (UI locale), day-help
  label and setup primary label, and the future-tense death preview.
- [x] 6.3 Declare a dark `color-scheme` and theme the native select.

## 7. Verification

- [x] 7.1 `npm run verify` (typecheck, lint, format, tests, build, fallback,
  offline, source policy, official, acceptance, version, role ownership).
- [x] 7.2 `node scripts/browser-check.ts` at 360, 390 and 640×360/1440 px.
- [x] 7.3 `openspec validate --changes --strict`, `openspec-check`,
  `check-types-policy`.

## Evidence

- RED: the old console contract failed after the readiness change —
  `node scripts/browser-check.ts` reported
  `the table is taller than the stage and scrolls inside it` and
  `the day card shows its transition preview`; the step action also swallowed
  the click that opened a sheet with a disabled confirm.
- GREEN: `npm run typecheck` (5 programs), `npm test` 1270 pass / 0 fail, and
  `node scripts/browser-check.ts` through the table, dialog, privacy, route,
  offline and phone-walk phases.
- Focused checks: `PG_BROWSER_CHECK=player-voting` and
  `PG_BROWSER_CHECK=madness-execution` pass.
- `src/ui/screens/table/helpers.test.ts`: `blockerActionText` returns the
  short label for every blocker.


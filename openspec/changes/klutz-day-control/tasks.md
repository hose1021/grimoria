# Tasks

## 1. Rules and characterization

- [x] 1.1 Read Klutz r1758 and the pinned death-trigger wording. Rules check:
      compliant; the missing control is an implementation defect, not a rules
      ambiguity.
- [x] 1.2 Record RED: the day-help form list was empty after the execution, and
      the panel selector timed out in the browser check.

## 2. Console

- [x] 2.1 Offer the `klutz` form while a dead Klutz owes the choice,
      independent of the day being open or ended.
- [x] 2.2 Render the Klutz panel with one living player and the existing
      Record choice action dispatching `recordKlutzChoice`.
- [x] 2.3 Add the Russian, English and Azerbaijani panel copy.

## 3. Tests

- [x] 3.1 Unit: the form is offered after `day.ended` and disappears once the
      choice is spent.
- [x] 3.2 Browser `klutz-day`: an executed Klutz, an evil target, the `klutz`
      win, the recorded choice, the journal line and no panel after a reload.

## 4. Documents

- [x] 4.1 No matrix status change: the Klutz rows stay `verified`.
- [x] 4.2 No schema, command payload or storage change.

## 5. Evidence

- RED: `dayHelpForms` returned `[]` for an executed Klutz and `[data-klutz-target]` never appeared.
- GREEN: `node --test --test-name-pattern="day-help sheet offers the Klutz"` passes.
- GREEN: `PG_BROWSER_CHECK=klutz-day node scripts/browser-check.ts` passes on a 390 px viewport.
- GREEN: `npm test` reports 1,302 tests, all passed.

# Tasks

## 1. Characterization

- [x] 1.1 Record RED: F-008 was a source-text assertion; the next day kept the
      target and the survival flag.
- [x] 1.2 Name the key from the phase, the day and the night.

## 2. Console

- [x] 2.1 Add `executionDraftKey` and clear `executeTarget` and
      `executeSurvives` when it moves.
- [x] 2.2 Keep the existing clear after an accepted execution and on import.

## 3. Tests

- [x] 3.1 Unit: the key moves on a new day and a phase change, and stays for
      unrelated state.
- [x] 3.2 Browser `day-reset`: a selected target and survival flag disappear
      after the day number changes.
- [x] 3.3 F-008 becomes behavioural through the key.

## 4. Documents

- [x] 4.1 No schema, storage or command payload change.

## 5. Evidence

- RED: the previous day's target executed on the next day.
- GREEN: the key unit test and `PG_BROWSER_CHECK=day-reset` pass; `npm test` 1,316 pass.

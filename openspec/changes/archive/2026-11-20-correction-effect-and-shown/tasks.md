# Tasks

## 1. Rules and characterization

- [x] 1.1 Read Witch r2682 and the correction contract. Rules check: the engine
      already accepts both changes; the console did not offer them.
- [x] 1.2 Record RED: `findings.test.ts` F-014 failed because neither
      `data-correct="effect"` nor `data-correct="shown"` existed.

## 2. Console

- [x] 2.1 Add the shown-role and effect kinds to the correction dialog.
- [x] 2.2 Seed the shown value from the player and list the player's active
      effects by id.
- [x] 2.3 Add the Russian, English and Azerbaijani copy.

## 3. Tests

- [x] 3.1 Browser `corrections`: deactivate a poison, change a shown role, and
      see the journal record each reason.

## 4. Documents

- [x] 4.1 No matrix status change.
- [x] 4.2 No schema, storage or command payload change.

## 5. Evidence

- RED: F-014 failed before the controls existed.
- GREEN: F-014 passes; `PG_BROWSER_CHECK=corrections` passes on 390 px; `npm test` 1,310 pass.

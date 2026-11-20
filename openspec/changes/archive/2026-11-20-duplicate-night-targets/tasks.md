# Tasks

## 1. Rules and characterization

- [x] 1.1 Read Innkeeper r3160, Shabaloth r1790, Po r3104, Barber r1757 and
      the Chambermaid and Fortune Teller text. Each says "two/three players",
      so one seat cannot be chosen twice. Rules check: compliant.
- [x] 1.2 Record RED: the Innkeeper, Shabaloth and Po duplicates completed, and
      the Barber duplicate was a silent no-op.

## 2. Engine

- [x] 2.1 Add the shared distinct-seat check to `completeStep` with `error.42`
      before any mutation.
- [x] 2.2 Delete the Trouble Brewing two-target duplicate branch and the
      Seamstress duplicate branch; keep their count and self checks.
- [x] 2.3 Change the `error.42` text to a script-neutral sentence in ru, en
      and az.

## 3. Tests

- [x] 3.1 Innkeeper duplicate rejected; preview is rejected and nothing
      changes.
- [x] 3.2 Shabaloth duplicate rejected without deaths; a distinct pair is
      allowed.
- [x] 3.3 Po duplicate rejected on the three-target step; a distinct triple is
      allowed.
- [x] 3.4 Barber duplicate rejected with no character change; a distinct pair
      swaps.
- [x] 3.5 Chambermaid duplicate rejected through the same shared rule; the
      Fortune Teller keeps its duplicate rejection and its count message.

## 4. Documents

- [x] 4.1 Cite the new tests in the rules matrix and the role dossiers.
- [x] 4.2 No schema, command payload or storage change.

## 5. Evidence

- RED: `node --test --test-name-pattern="multi-target night step rejects"` failed on the base with `error.drunk-required` (the duplicate Innkeeper pair reached the ability rule) and the Barber duplicate test did not exist.
- GREEN: `node --test --test-name-pattern="multi-target night step rejects|Barber swap rejects the same player twice"` reports 2 passed.
- GREEN: `npm test` reports 1,301 tests, all passed.
- GREEN: `npm run typecheck` passes.

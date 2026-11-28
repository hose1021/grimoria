# Mixed regression contracts

Issue: #220

## Why

The certified mixed script composes the TB, BMR and S&V role builders, but two
shared rules were still gated by a single-edition predicate. A mixed script
therefore killed a Monk-protected or Soldier player with an S&V Demon, and it
did not apply the Vortox or Mastermind win rules. The transformation path was
not covered across editions either. These are cross-edition regressions, not
new mechanics.

## What changes

- A mixed script applies the shared protection rules to every edition's
  deaths: the Monk's protection, the Soldier, and the BMR Fool/Tea Lady/Sailor
  protections.
- A mixed script applies the shared win rules of the editions it composes: the
  Vortox day-end win, the Evil Twin good-twin execution and the Mastermind
  extra day. The Mayor and the shared demon-dead/two-alive rules already apply.
- The coverage adds a cross-edition Barber swap and the protection, victory
  and transformation regressions.
- No new engine, effect graph, journal or storage shape is added.

## Impact

- Changed: `src/core/engine/death.ts`, `src/core/engine/sv.ts`,
  `src/core/engine/mixed.test.ts`.
- Added: this OpenSpec change.
- Out of scope: a new character, a new jinx pair, a schema change.

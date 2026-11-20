# Tasks

## 1. Characterization

- [x] 1.1 Record RED: F-010 failed for a drunk and poisoned seat, and the
      projection reported the Drunk role as poisoned and not drunk.
- [x] 1.2 Confirm the queue panel is already mounted; no surface work needed.

## 2. Read models and badges

- [x] 2.1 Report drunk and poisoned independently in `seatProjection`.
- [x] 2.2 Add both badges in `seatBadges`.

## 3. Dead surfaces

- [x] 3.1 Delete `publicSnapshot`, `PublicSnapshot` and its local helper; retarget
      the privacy tests at `publicGameView`.
- [x] 3.2 Delete `publicRoleView` and its test usages.
- [x] 3.3 Delete the unused `RoleCard` hidden mode.

## 4. Tests

- [x] 4.1 Unit: the Drunk role is drunk, not poisoned; adding a poison effect
      makes both true.
- [x] 4.2 F-010 passes with both badges.

## 5. Evidence

- RED: `seatProjection` reported `drunk: false, poisoned: true` for the Drunk role.
- GREEN: the projection test and F-010 pass; `npm test` 1,312 pass; oxlint and typecheck pass.

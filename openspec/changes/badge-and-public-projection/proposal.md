# Proposal

Issue: #331

## Why

- A player who is both drunk and poisoned showed only the drunk badge: the seat
  projection suppressed `poisoned` while a drunk effect existed, and the badge
  list used `else if`. A true state was hidden.
- Three public surfaces duplicated or never rendered: `publicSnapshot` copied
  `publicGameView`, and `publicRoleView` and `RoleCard mode="hidden"` had no
  screen caller.

## What changes

- The seat projection reports `drunk` and `poisoned` independently (the Drunk
  role counts as drunk; a poison effect counts as poisoned).
- The badge list adds both badges when both are true and keeps the impairment
  fallback for a poison with no recorded effect.
- `publicSnapshot`, `PublicSnapshot` and `publicRoleView` are deleted; the
  privacy tests use `publicGameView`. `RoleCard` loses the unused hidden mode.

## What stays

- The privacy projections and their assertions.
- The queue panel is already mounted in the table menu, so no surface changes.

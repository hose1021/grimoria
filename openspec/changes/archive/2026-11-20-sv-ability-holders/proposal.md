# Proposal

Issue: #219

## Why

The Philosopher can gain a good character's ability. Several day and command
paths still looked only at the printed `player.roleId`, so the borrowed copy
was unreachable:

- Juggler r2401 and Philosopher r2421: a borrowed Juggler must guess on *their*
  first day with the ability.
- Klutz r1755 and Philosopher r2421: a borrowed Klutz's public choice works even
  when the Philosopher is dead.
- Savant r2910: each holder may visit once per day; the engine kept one global
  visit per day.
- Mathematician r3153: "The Mathematician does not detect their own ability
  failing"; `recordAbnormal` accepted the Mathematician's own character.

## What Changes

- The Juggler day guard and the Klutz choice resolve the holder through
  `hasAbility`, the same helper the Artist and Savant already use.
- `savantVisit` records one visit per player per day and keeps every visit in
  the additive `savantVisits` list; `savant` stays the latest visit.
- `recordAbnormal` rejects the Mathematician's own character with a new
  semantic `error.mathematician-self`, translated in en/ru/az.

## Out of Scope

- The borrowed Artist path, which already uses `hasAbility`.
- A second Juggler record or a per-holder ledger beyond the Savant visit list.
- Any change to the night queue or the Philosopher's choice.

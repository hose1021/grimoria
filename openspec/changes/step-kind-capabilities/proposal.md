# Step-kind capabilities: death and day

Issue: #212

## Why

ADR 0002 replaces the role-owned `onDeath` hook and the edition-file day
branches with typed capabilities. The Imp's hook imports `becomeDemon` and
`isImpaired`, so the role mutates state and duplicates shared mechanics. The
Slayer's day rule sits in `day.ts`, so the role module does not own it.

## What changes

- `RoleCapability` gains the `death-trigger`, `day-action`, `win`,
  `transformation` and `information` arms with read-only contexts and small
  decisions.
- `RoleEffect.kill` gains an optional `cause` and `succession` flag so the
  Slayer death reuses the shared death, succession and win path.
- `src/core/engine/death-ability.ts` applies death decisions through
  `becomeDemon`.
- `src/core/engine/ability.ts` gains `applyDayCapability`.
- The Imp and Slayer modules declare capabilities and stop relying on the
  engine branches; the Saint declares the win contribution, the Pit-Hag the
  transformation decision and the Empath its information count.
- The architecture exception map drops both Imp entries.
- The legacy `RoleModule.onDeath` field is removed.

## Impact

Behavior is unchanged: Scarlet Woman first, one living Minion inherits, several
Minions produce the existing host choice; a Slayer hit kills the registered
Demon, and a miss or impairment spends the shot and logs the existing reasons.
No storage, command, journal or winner shape changes.

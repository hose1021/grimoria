# Design

## Context

`hasAbility(player, roleId)` returns true for the effective role and for a
Philosopher's borrowed ability. `dayAbilityHolder` uses it for the Artist and
the Savant. The Juggler guard, the Klutz command and the Mathematician marking
compared `player.roleId` instead.

`state.savant` is one record for the latest visit; the guard rejected any second
visit on the same day, even from another holder.

## Decision

- Juggler: `orderedPlayers(state).find((player) => player.alive && hasAbility(player, "juggler"))`.
- Klutz: `hasAbility(player, "klutz") && !player.alive && !used.klutz`.
- Savant: reject only when the same player already visited that day; append every
  visit to `state.savantVisits` (optional, additive) and keep `state.savant` as
  the latest record for the existing screens.
- Mathematician: reject the holder of the Mathematician ability, borrowed or
  printed, with `error.mathematician-self`.

## Risks / Trade-offs

- `savantVisits` grows with days. A game has at most a few visits; the list is
  part of the saved state and replays with it.
- The borrowed Juggler shares the single `state.juggler` record. A drunk printed
  Juggler cannot use the ability, and the Philosopher's copy is the working one,
  so the single record is correct.

## Test plan

- `snv.test.ts`: borrowed Juggler guess, borrowed Klutz command, two Savant
  holders, Mathematician self rejection.
- Full `npm test`, typecheck, acceptance, OpenSpec checks.

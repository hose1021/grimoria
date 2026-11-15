# Design

## Context

`src/core/engine/information.ts` resolves registration through
`alignmentOf(state, player, registrations)`. A registration map holds at most
one value per player for the whole query. `chefCount` walks the seat ring and
counts adjacent pairs where both players register evil.

Chef r2510 Example 4 requires the Recluse to register differently for the two
pairs it touches in one Chef query. One map per query cannot express that, so
the pinned answer 1 is unreachable: with the Recluse good the count is 0, with
the Recluse evil it is 2.

## Goals / Non-Goals

**Goals:**

- Offer every count the pinned registration rule permits.
- Keep the Storyteller as the only decider of the count.
- Keep the existing command path, journal case and numeric option control.

**Non-Goals:**

- A new registration model for every role. The per-pair requirement is specific
  to a query that counts several pairs.
- Guessing a registration. The host still chooses the answer.

## Decisions

### The legal answer is a range, not a registration map

For each adjacent pair, ask two questions about each player:

- `canBeEvil`: the player registers evil without an override (real evil), or is
  a sober, healthy Recluse.
- `canBeGood`: the player registers good without an override (real good), or is
  a sober, healthy Spy.

The pair can contribute 1 when both `canBeEvil`; it can contribute 0 unless both
are unable to be good. The two registration choices are independent per pair,
because the pin allows a different registration "at different parts of the same
night". A `min` below `max` therefore makes every integer between them legal,
and the host must answer.

`chefRegistrationRange` computes the range. `infoForStep` offers
`uniqueNumbers(min, max)` and sets `needsChoice`. `givenIsLegal` already
validates a `{ value }` answer for a `number` step; `caseForStep` already maps a
non-impaired option list to `registration-ambiguity`.

### The computed value stays the default only

`value` remains `chefCount(state, registrations)`, the no-override count. It is
shown as context, but `needsChoice` prevents completion without a host answer.

### An impaired Chef keeps the full range

A drunk or poisoned Chef receives false information: any count from 0 to the
number of players is legal, exactly as before. This branch runs first and is
unchanged.

## Risks / Trade-offs

- A host may choose a count that no single registration map produces. That is
  the pinned behaviour, not an inconsistency.
- The range assumes each pair's registration is independent. The pinned example
  states exactly that for the Chef query.
- The option list can contain a number above the computed default. The console
  already renders numeric options from `info.options`.

## Test plan

- `engine.test.ts`: pinned Recluse-between-two-evil arrangement offers
  `[0, 1, 2]`, accepts 1, rejects 3.
- `engine.test.ts`: no effective Spy or Recluse keeps the computed count and
  requires no answer.
- Existing `host-choice.test.ts` and `table.test.ts` completions supply the
  host's count.
- Full `npm test`, `npm run typecheck`,
  `node scripts/check-acceptance.mjs`, `node scripts/openspec-check.mjs`.

## Preservation

The change touches only the Chef branch of `infoForStep` and its tests. No
state field, command, journal entry, storage key, note or winner reason changes.
A game without an effective Spy or Recluse keeps its previous projection.

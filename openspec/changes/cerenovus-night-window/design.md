# Design

## Source

`docs/official/wiki/Cerenovus.r3048.wikitext`:

- Ability: "they are mad they are this character tomorrow".
- Storyteller instructions: "During the next day or night, if you feel that
  the mad player has not done their best to convince the group they are this
  character, you can decide to execute them."

The two statements fix the window: the token is created at night N, covers day
N and night N+1, and expires at the next dawn. It is not executable on night N
because the player has not had the mad day yet.

## Effect lifetime

`effectActive` treats `expires` as exclusive. The Cerenovus token therefore sets
`expires: { phase: "day", number: at.number + 1 }`. This keeps it active at
night N+1 (cycle 2N+1) and drops it at day N+1 (cycle 2N+2).

## Guards

Two separate conditions share the window:

- `madnessReviewProjection` hides a Cerenovus token created on the current
  night, so the menu cannot offer an execution before the mad day.
- `applyMadnessPenalty` rejects that case with `error.73`, so a stale command or
  a direct caller cannot bypass the projection.

Both conditions name `madness === "cerenovus"`. The Mutant token has a standing
`start` and remains executable at night, as pinned by Mutant r1755.

## Compatibility

No field, command payload, storage key or journal shape changes. The only public
addition is the rejection code `error.73` with RU/EN/AZ copy. Existing journals
replay with the same commands; the longer lifetime changes only whether a
subsequent `madnessPenalty` is accepted.

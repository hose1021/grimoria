# Design

## Decisions

- **Legal swap.** A replacement is a script role of the same type, not in the
  bag, such that `compositionFor(count, next)` equals `bagCounts(next)` for all
  four types. This reuses the validator's composition path, so Baron, Godfather,
  Fang Gu and Vigormortis are offered only when the counts allow them.
- **Repair, don't reset.** The swap keeps Storyteller choices that stay legal
  (bluffs, an explicit Lunatic mask, the Drunk mask) and redraws only a choice
  the swap broke, with the same rng the random bag uses.
- **Pure core helpers.** Both functions live in `src/core/model/rules.ts` and
  take an injected rng; the screen only renders and dispatches `bagUpdate`.
- **Look.** Owner picked layout B (ability cards with a swap drawer) and
  highlight 2 (team-coloured fill) from six previewed variants on 2026-11-27.
  Team colours stay on spines, rings and small checks; the fill is a 25 %
  gradient that fades into the card, per DESIGN.md ("never as fills for large
  surfaces").

## Risks

- A tinted gradient on Townsfolk is softer than on other teams; the ringed icon
  and the check carry the state as well.

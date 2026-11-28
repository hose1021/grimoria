# Design

## Context

The three defects shared a shape: the core rule was present, but a later layer
in `Core -> Application -> Commands -> Read Models -> UI Conditions ->
Production Component -> Browser Interaction` diverged.

- Pit-Hag: `completeStep` sets `step.canKill` only after `replaceCharacter`.
  The console builds one payload before that call, so the death panel could
  never appear in the same completion.
- Tinker: `nightStepFor` reads the capability arm for the night. An arm with
  `timing: "other"` returns nothing on night 1, even if the role is in the
  printed order.
- Journal: `SidePanel` sliced `state.log` before `EventLog`, so the full
  history never reached the renderer.

## Decision

- `canMarkStepDeaths(state, stepRole, draftedRole, canKill)` owns the Pit-Hag
  affordance. It checks the drafted role's team and whether the character is
  already in play, including a Philosopher-borrowed character. The engine
  remains the authority: a forced death on a no-op step returns `error.51`.
- The Tinker arm is `timing: "any"`. `buildBmrNightQueue` appends its
  first-night step at `sequence.length`, not inside the printed order, so the
  keys of later steps do not move. `buildsFirstNightTinker` keeps journals
  recorded before the new ruleset on their old queue.
- `EventLog` receives every entry and a `previewCount`. It renders the newest
  eight until the host expands the list. `data-entry-case` marks each
  host-choice line so the inspection contract is testable without matching
  localized text.

## Risks / Trade-offs

- The Pit-Hag panel appears before the command runs. A host who drafts an
  impaired Pit-Hag sees the control and gets a rejection; the engine guard is
  the official condition, not the panel.
- The first-night Tinker step is synthetic. It has no printed slot and uses the
  sequence length as its order; the printed order constants stay unchanged.
- A ruleset bump is required so old journals replay their old queue. New games
  use the new version; old saved games keep their step keys.

## Test plan

- `bmr.test.ts`: the first-night queue contains the Tinker, `order` equals the
  sequence length, and `canKill` is true.
- `roles/tinker/role.test.ts`: the step and resolver exist on nights 1, 2 and 5.
- `helpers.test.ts`: the Pit-Hag control is false for no draft, a non-Demon, an
  in-play Demon and true for a not-in-play Demon.
- `browser-check.ts`: real `/table` interactions for all three, including the
  negative cases listed in the proposal.
- Full `npm test`, `npm run verify`, OpenSpec strict and the full browser suite.

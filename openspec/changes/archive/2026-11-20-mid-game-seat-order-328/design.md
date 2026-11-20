# Design

## Decision

The phase policy is the single gate. `setOrder` declares `setup`, `deal` and
`seat` in `COMMAND_PHASES`, so the command path, preview and any direct caller of
`lifecycleGuard` reject a mid-game reorder before the handler writes. No second
check is added to `setOrder` or to the screen.

The seat screen reads the same phase boundary and renders a locked panel instead
of the ring. It keeps the app bar so the host can leave, and the panel links back
to `/table`. The screen offers no confirmation because no legal mid-game reorder
exists to confirm.

## Alternatives

A correction mode was the other owner option. It would need a warning that names
the affected abilities, a confirmation and a journal entry, plus a decision on
information already given. The prohibition is smaller and matches the physical
circle.

## Historical journals

Replay applies every journal entry with the `rulesetVersion` recorded in that
entry. The old rule is therefore preserved for history, not removed: the guard
reads the command version, and an entry recorded before
`tb-bmr-snv-2026-11-20` keeps the `any` phase policy. A command sent now carries
the current version and is rejected outside `setup`, `deal` and `seat`.

The fixture `src/core/engine/fixtures/legacy-seat-order-game.json` was generated
with `applyCommand` at `c75e381`: a 7-player Trouble Brewing game reorders the
seats on night 1 and restores them on day 1. Replay, the night slice and a store
undo all reach the order recorded in the journal.

## Risk

A host who seated players wrongly must correct the order before `startNight` or
rebuild the bag and redeal. `error.47` already means "the game has started", so
the rejection needs no new error code. Bad Moon Rising and Sects & Violets share
the policy and lock at the same transition.

## Verification

Engine: `lifecycle.test.ts` rejects the reversed order during a night and proves
the state is unchanged. Findings: F-017 asserts the guard rejects a live day.
Browser: `seat-lock` seeds a night, checks the locked screen and the absence of
the commit control, dispatches `setOrder` and asserts the rejection, then seeds
`deal` and checks that the ring returns.

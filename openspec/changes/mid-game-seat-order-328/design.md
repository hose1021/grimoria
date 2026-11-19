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

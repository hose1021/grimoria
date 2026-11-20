# Design

`state.day.execution` already records the day's execution independently of
`deathId`. Use this existing event for Mayor and Vortox. `kill` already returns
null for dead targets, so removing the host-action rejection records a corpse
execution without another death. Keep the one-execution guard and Undertaker's
`executionDeathForDay` unchanged. No inferred Storyteller choice is introduced.

Sources: States r1039 (Life and Death), Mayor r2995 (How to Run), Vortox r3017
(How to Run), all pinned in `docs/rules-matrix.md`.

The existing tests claiming a corpse cannot be executed and grants a Mayor win
are corrected because the owner approved the source-backed contract correction,
not to suppress unrelated failures. New independent regressions first reproduce
all three defects.

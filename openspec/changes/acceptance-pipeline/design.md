# Design

## Context

Every persisting action is already a validated command
(`src/core/engine/commands.ts`). Setup is a sequence of commands: `bagUpdate`
prepares the bag, `dealGame` deals the roles, `setOrder` marks the game `seat`,
`autoSecrets` fills the secrets the engine can derive, and `startNight` builds
night 1. The Storyteller console calls `startNight` from the secrets screen, but
nothing exposes the whole start as one action and no test drives the rest of the
game through commands.

Issue #46 (Stage 5) asks for the pipeline the players follow. This change is
its pipeline slice. The acceptance test has to
start from `createGame`, prepare a legal bag, start the game, resolve the first
night and then keep going until a winner exists, using only the engine's command
surface and the engine's legal options.

## Decisions

### `startGame` is the missing host action, not a new rule

The engine already knows how to deal, seal and start; the gap is one atomic
entry point. `startGame` runs those steps in order and returns the result of
`startNight`:

1. `setup` phase: `dealGame` with the caller's assignment (or the existing
   random deal) and its validation.
2. Mirror `state.order` onto `player.seat`, then move `deal` to `seat` exactly
   as `setOrder` does.
3. `autoSecrets({ onlyMissing: true })` so derived information is filled but an
   existing host choice is never overwritten.
4. `startNight`, whose `secretsErrors` still gate the start.

A Drunk shown an information role has no derived pair by rule: false
information is a Storyteller choice. `startGame` therefore returns that error,
and the host records the choice with `setSetupInfo` before calling it again.
The command does not auto-fill a false-information answer.

The command payload (`{ options: { assignment?, secrets? } }`) stays
deterministic: the acceptance tests always pass an explicit assignment, so the
same seed deals the same game. Calling the command without an assignment uses
the same random deal as `dealGame`.

### The test is the host, not a fixture

`js/acceptance.test.mjs` builds a game with `createGame`, runs the bag command,
starts through `startGame` and then drives every phase:

- night steps are completed via `completeNightStep`; target sets are enumerated
  from `targetBounds`/`targetMode`, a false answer comes from
  `infoForStep().options`, a redirect or Demon heir comes from the
  `requires-storyteller-choice` options, and a step with no legal completion is
  skipped with the legal `skipStep` command;
- days open nominations, pick the first nominator/nominee pair the engine
  accepts, record the votes and execute, then end the day;
- every command is validated first and applied second, so an illegal action
  fails the test instead of being skipped.

The journal assertion is part of the acceptance: `completeNightStep`,
`endNight`, `startGame`, `openNominations`, `nominate`, `recordVotes`, `execute`
and `endDay` must each add a log entry, and the finale must log a `winner`.

### The sampled interval is stated, not implied

The seeded test uses the shipped Trouble Brewing presets for player counts 5-15,
three seeds per count (seed 1, 2, 3; the preset variant is `seed % 3`), 33 games
in all. The assignment of roles to seats and every host choice derive from a
small seeded PRNG (`mulberry32`), and the test replays one seed twice and
compares the whole summary, so the sample is deterministic.

Limits: this samples preset bags and one host line per seed. It is not
exhaustive over every legal bag, every role-to-seat assignment, every target
choice or every legal Storyteller decision; it proves the pipeline is reachable
and deterministic on the stated interval, not that every game is winnable.

## Risks

- `startGame` calls `autoSecrets`, which could be read as auto-filling host
  choices. The function fills only derived values (`onlyMissing`) and still
  rejects the start when the Drunk needs false information, so the policy holds.
- The driver's choices are intentionally simple (first legal pair, random legal
  target). A future rule change that makes a step unsatisfiable will surface as
  a failed acceptance test, not as a silent skip.
- The command union is duplicated in `src/core/model/types.ts` and
  `src/core/commands/contracts.ts`; both are updated together and the
  compile-time contract test keeps them identical.

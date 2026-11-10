# Design

## Decision

Validate the consecutive-target restriction in `completeStep` for every step
that carries `previousTarget`. The step builder projects the target only when
the actor chose it on the immediately preceding night. Both abilities say
"different to last night" and the official almanac says the player "may not
choose the same player two nights in a row"
([Devil's Advocate r2594](https://wiki.bloodontheclocktower.com/index.php?title=Devil%27s_Advocate&oldid=2594),
[Exorcist r2973](https://wiki.bloodontheclocktower.com/index.php?title=Exorcist&oldid=2973)).
A night without a choice cannot form a pair of consecutive nights, so the next
choice may use any legal target, including the last one chosen.

Rejected commands use the existing command contract: `ok: false`,
`errorCode: "error.50"`, and an unchanged draft.

## Alternatives

- Track the last target without a night and reject any repeat: this turns "last
  night" into "last time the ability worked" and blocks a legal choice after a
  skipped night, a death or a role change.
- Validate inside `completeBmrStep`: that function runs after the step starts
  mutating and after information choices; a rejection there is harder to keep
  atomic and would duplicate a check for two roles.
- Store the previous target in `state.setup`: that mixes per-night play state
  into setup and breaks export/import semantics.
- Validate only in the UI: the engine remains reachable from commands and
  imports, so the restriction would not hold.

## Behavior

- `used.<role>Target` stores the chosen player; `used.<role>TargetNight` stores
  the night number of that choice.
- `previousTarget` exists only when `TargetNight === current night - 1`. It is
  absent on the first night, after a skipped step, after a night with no wake,
  and when the record comes from an older role stint.
- The check applies to the full `targetIds` array. Both roles choose one target,
  so one comparison is enough; the generic form protects future multi-target
  roles that declare `previousTarget`.
- A repeat target is rejected while the pair is consecutive, even if the player
  died since the choice; the ability forbids the choice, not only the effect.
- The UI continues to disable the previous target and never renders it as a
  legal option.
- `error.50` keeps its original code and message.

## Compatibility

No schema change. `used.<role>TargetNight` is an optional field. A legacy save
has `used.<role>Target` without a night; the engine treats the age of that
record as unknown and does not assert that it was last night. This avoids
blocking a legal choice; the next successful choice writes a complete record.
The alternative, assuming the record was last night, would preserve an illegal
rejection after a skipped night for every old save.

## Risk

- A legacy save can allow one repeat that the previous build would have
  rejected. The risk is bounded to that save and disappears after the next
  completed choice; no history exists to resolve it correctly.
- The engine trusts `step.previousTarget` projected at step creation. A command
  cannot change it without changing the state that built the queue.
- A demoted and restored role keeps its old used-target record. The night check
  makes that record stale after one night, which is the intended behavior.

## Verification

- RED: five tests fail before the night marker is added.
- GREEN: the same tests pass; the full suite stays green.
- `openspec validate --changes --strict` and `node scripts/openspec-check.mjs`
  pass.

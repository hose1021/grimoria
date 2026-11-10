# Design

## Decision

Validate the consecutive-target restriction in `completeStep` for every step
that carries `previousTarget`. The step builder already projects the value from
`actor.used`; the change extends that projection to the Devil's Advocate and
stores its target on successful completion.

Rejected commands use the existing command contract: `ok: false`,
`errorCode: "error.50"`, and an unchanged draft.

## Alternatives

- Validate inside `completeBmrStep`: that function runs after the step starts
  mutating and after information choices; a rejection there is harder to keep
  atomic and would duplicate a check for two roles.
- Store the previous target in `state.setup`: that mixes per-night play state
  into setup and breaks export/import semantics.
- Validate only in the UI: the engine remains reachable from commands and
  imports, so the restriction would not hold.

## Behavior

- `previousTarget` is the target of the last completed step for the same actor
  and role. It is absent on the first night, after a skipped step, or for a
  legacy save that never recorded it.
- The check applies to the full `targetIds` array. Both roles choose one target,
  so one comparison is enough; the generic form protects future multi-target
  roles that declare `previousTarget`.
- A repeat target is rejected even if the player died since the last night;
  the ability forbids the choice, not only the effect.
- The UI continues to disable the previous target and never renders it as a
  legal option.
- `error.50` is a new code; existing saves and commands keep their codes.

## Compatibility

No state field is added. `actor.used.devilsadvocateTarget` is optional and is
created on the first successful step. Old saves stay valid: without a stored
target the ability has no previous night to compare.

## Risk

- A host may want to repeat a target after a role change or a new actor. The
  record is per player id, so a new Devil's Advocate or Exorcist starts without a
  previous target until its own first completion.
- The engine trusts `step.previousTarget` projected at step creation. A command
  cannot change it without changing the state that built the queue.

## Verification

- RED: two role tests fail before the validation is added.
- GREEN: the same tests pass; the full suite stays green.
- `openspec validate --changes --strict` and `node scripts/openspec-check.mjs`
  pass.

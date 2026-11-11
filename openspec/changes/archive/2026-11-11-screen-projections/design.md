# Design

## Context

The engine is the only owner of the rules and lives in `src/core`. The native
screens are React components under `src/ui`; the application layer already
coordinates the store, the command dispatch and the read models. Before this
change the console read the engine directly:

| Screen | Engine calls |
|---|---|
| `table/cards.tsx` | `currentStep`, `stepProgress`, `demonChangePending`, `infoForStep`, `activeEffects`, `attackNeedsRedirect`, `isImpaired`, `protectionFor`, `soldierSafe`, `characterChoices`, `executionThreshold`, `secretsErrors` |
| `table/dialogs.tsx` | `infoForStep` |
| `table/frame.tsx` | `currentStep` |
| `table/parts.tsx` | `isImpaired`, `protectionFor`, `butlerMaster` |
| `bag.tsx`, `secrets.tsx` | `setupErrors`, `secretsErrors` |
| `entry/main.ts` | `previewCommand`, `newCommandId`, `RULESET_VERSION` |

Two of those calls were not a straight read: the step card derived the target
bounds from `targetMode`, and the seat select tested whether an Imp attack on a
Mayor needs a redirect. Both are rules expressed in JSX.

## Goals

- One place computes each derived fact the screens render.
- The screen tests fail when a screen imports the engine again.
- No rendered value changes.

## Non-goals

- New UI behavior, layout, copy or routes.
- Moving the remaining legacy screens.
- Adding coverage thresholds or a general projection framework.

## Decisions

**The read models live in `src/application/read-models/table.ts`.** The layer
already owns read models, and the UI is allowed to import application modules.
`src/core` stays DOM-free; the projections take a `GameState` and optional
draft input and return plain objects. Each function is a thin wrapper: it calls
the engine function the screen used to call, with the same arguments. That is
what keeps the change behavior-free.

**The preview command moves to `src/application/dispatch/preview.ts`.** The
composition root is allowed to wire ports, not to invent a ruleset version or a
command id. `previewOnState` takes the state and the input and returns the same
`CommandResult` the screens consume; `toPreviewOutcome` stays in the UI because
it adapts the result to the shell's outcome type.

**`InfoResult` becomes an engine export.** The read model returns
`infoForStep`'s result, and the screen previously asserted a local `StepInfo`
interface. `StepInfo` is now an alias of the engine's `InfoResult`, re-exported
from the read model so `src/ui` still imports no engine module. The engine keeps
the same value shape; the type is a `type` alias so the object stays assignable
where the engine passes it as a record.

**`targetBounds` lives with the queue.** The target count follows the
`targetMode` and the BMR/S&V bounds that `src/core/engine/night.ts` sets when it
builds a step, so the function sits next to `targetModeFor` and the completion
check. The read model re-exports it; `src/application` does not own the rule.

**The structural test reads the source, not the runtime.** A screen that calls
an engine function without importing it cannot exist, so the import test is the
enforceable boundary. The test excludes test files: the UI tests may import the
engine as a fixture oracle, which is exactly what proves the projection equals
the engine.

**The projection test is table-driven over real commands.** A row names a phase
and issues the commands the screen issues in it; after every applied command
the test compares the whole projection against the engine calls. The scenario
covers setup, the first night, the day, the second night and an Imp attack on
the Mayor, so every derived field is compared in more than one phase.

Most of those assertions pair a projection field with the same engine call, so
they catch a projection that drops an argument or a filter, not a wrong rule.
The test therefore also pins independently derived values: the threshold is
`ceil(living / 2)`, a fresh queue holds three steps, the Chef counts one evil
pair and two with the Recluse registered evil, a poisoned Chef and a Butler's
master are projected, and the Monk's protection makes the Soldier safe on the
second night.

**Small projections for a single field.** `progressProjection` exists because
the step card renders only the progress; the side panel still reads the table
projection because it renders the step and the progress together. The accepted
cost is one extra `currentStep` lookup per console render, the same call the
engine already makes for the card.

## Risks

- **A projection drops a filter or swaps an argument, so the screen renders a
  different value.** Mitigation: the projection test compares each field with
  the direct engine call after every command; a wrong argument fails on the
  first row that exercises it.
- **A screen adds a direct engine import later.** Mitigation: the structure
  test fails and names the file and the specifier.
- **The read model becomes a second rule layer.** Mitigation: the design keeps
  every function a wrapper; the review rule is that a projection may reshape,
  never compute.

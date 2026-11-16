# Design

## Context

See `proposal.md` - Why. Baseline: `main` at `822917c` (2026-11-16).

- Phase is the plain union `setup | deal | seat | night | day | over`
  (`src/core/model/types.ts`, `src/core/commands/contracts.ts`). ADR 0002
  section 6 already documents the transition owners; the guards are not
  centralized.
- The command path is atomic: `runDraft` clones, handlers mutate the clone, and
  a rejection discards it (`src/core/engine/commands.ts`).
- Duplication measured on the baseline: 21 `errorCode: "error.6"` winner
  preambles and 15 `errorCode: "error.7"` day preambles outside tests.
- Missing guards: `endNight` checks only the winner, a pending heir and
  unfinished steps (`src/core/engine/night.ts`); `dealGame` checks only the bag
  (`src/core/engine/setup.ts`); `bagUpdate` assigns any `patch.phase`
  (`src/core/engine/setup-commands.ts`).
- `manualCorrection` moves `over` back to `day` or `night` for the
  cleared-winner correction (`src/core/engine/corrections.ts`).
- `normalizeScript` derives `manualOnly` from the pool but preserves an
  explicit `true` on a single-edition pool. `validateStateStructure` rejects a
  mixed pool without the flag, not the reverse. `normalizeScriptState` adds the
  flag to a legacy mixed save.
- Direct engine callers exist: `src/entry/screens/demo.ts` drives its own game
  with `dealGame`, `startNight`, `endNight` and `endDay`; tests call handlers
  directly. Guards must therefore stay in the handlers, not only at the
  command boundary.

## Goals / Non-Goals

**Goals:**

- One table for the phase policy of every command type.
- One guard helper reused by every phase-sensitive handler.
- Preserve every existing error code and message where a guard already exists.
- Add the three missing guards and the manual-only boundary.
- Prove atomic rejection at the command boundary and handler level.

**Non-Goals:**

- No state-machine library, no new dependency, no XState.
- No change to role rules, win reasons, jinx resolution or night order.
- No migration of UI phase checks; screens render state, they do not own policy.
- No centralization of non-phase preconditions: `day.ended`, `day.open`, step
  existence, nomination existence and winner reasons stay in their handlers.
- No schema, storage key, command payload or journal change.

## Decisions

### One policy table and one guard

Add `src/core/engine/lifecycle.ts`:

```ts
export interface PhaseRejection {
  ok: false;
  errorCode: string;
  error: string;
}

export interface PhasePolicy {
  readonly phases: readonly Phase[] | "any";
  readonly reject: PhaseRejection;
}

export const COMMAND_PHASES: Record<CommandType, PhasePolicy>;

export function lifecycleGuard(
  state: GameState,
  type: CommandType,
): PhaseRejection | null;
```

`lifecycleGuard` returns `null` when the command is allowed. For a policy with
an explicit phase list it returns `error.6` when `state.winner` is set, then the
policy rejection when `state.phase` is outside the list. `"any"` policies skip
both checks. This preserves the existing winner-first order at every site.

`Record<CommandType, PhasePolicy>` is checked by the type checker, so a new
command cannot ship without a policy. A test iterates `COMMAND_TYPES` and
asserts the table covers each one.

### Command matrix

| Commands | Allowed phases | Rejection |
| --- | --- | --- |
| `startNight` | `deal`, `seat`, `night` | `error.68` |
| `completeStep`, `completeNightStep`, `endNight`, `skipStep`, `chooseDemonHeir`, `recordBmrOutcome`, `recordSvOutcome`, `resurrectPlayer` | `night` | `error.78` |
| `openNominations`, `nominate`, `recordVirginNomination`, `recordVotes`, `setVoteCount`, `setDeadVoteUsed`, `cancelNomination`, `resetVotes`, `execute`, `endDay`, `useSlayer`, `gossipStatement`, `jugglerGuess`, `artistQuestion`, `savantVisit`, `moonchildChoice` | `day` | `error.7` |
| `executeByDecision`, `madnessPenalty`, `recordAbnormal`, `recordKlutzChoice`, `tinkerDeath` | `day`, `night` | `error.7` |
| `recoverClaim` | `setup`, `deal`, `seat`, `night`, `day` | `error.6` |
| `dealGame`, `startGame`, `autoSecrets` | `setup`, `deal`, `seat` | `error.47` |
| `bagUpdate` without a roster reset | `setup`, `deal`, `seat` | `error.47` |
| `bagUpdate` with `resetRoster` or `count` | any | none |
| `claimSeat` | `deal`, `seat` | `error.47` |
| `setOrder`, `setHerring`, `setSetupInfo`, `setSetupInfoZero`, `normalizeSecrets`, `setWinner`, `manualCorrection`, `setNotes`, `setReviewOpen`, `newGame`, `importGame` | any | none |

Each phase-sensitive handler starts with
`const guard = lifecycleGuard(state, "<type>"); if (guard) return guard;` and
then keeps its non-phase checks. The existing duplicated winner/day preambles
are deleted. `completeNightStep` keeps its step lookup and delegates the phase
check to `completeStep`; both share the `night` policy.

`executeByDecision` keeps its `nightMadness = phase === "night" &&
cause === "madness"` branch. `nominate` keeps `!state.day.open` -> `error.9`
after the guard; `openNominations` and the vote commands keep
`state.day.ended` -> `error.8`; `completeStep` keeps step existence and
idempotency.

### Transitions

The transition owners stay those of ADR 0002. The policy table makes the
allowed source phase explicit:

| Transition | Owner | Source phases |
| --- | --- | --- |
| `setup -> deal` | `dealGame` | `setup`, `deal`, `seat` (re-deal) |
| `deal/seat -> night` | `startGame`, `startNight` | `setup`, `deal`, `seat` |
| `night -> day` | `endNight` | `night` only |
| `day -> night` | `endDay` | `day` only |
| any -> `over` | `setWinner` | any |
| `over -> day/night` | `manualCorrection` cleared winner | `over` |

`endNight` now requires `night`, so a stale tab cannot rebuild the day and
discard its nominations. `dealGame` now requires a setup family phase, so a
running game cannot be re-dealt. `bagUpdate` with `resetRoster` or `count` is
the supported route back to setup from any phase: `setRoster` clears the game
and sets `phase = "setup"`. A bag edit without that reset keeps the setup
family guard. `bagUpdate` accepts `patch.phase` only when `resetRoster` is true
and the value is `setup`; any other phase patch is `error.47`.

### Manual-only boundary

- `normalizeScript` computes `mixed = isMixedEdition(unique)`. It keeps the
  existing derivation `manualOnly: isMixedEdition(unique)` when the field is
  absent, and rejects an explicit `true` for a single-edition pool with
  `error.79` (`Ручной режим доступен только смешанному сценарию.`).
- `validateStateStructure` adds
  `check(!script.manualOnly || isMixedEdition(scriptRoles), ...)`, covering
  import and hand-edited saves.
- `normalizeScriptState` clears `manualOnly` on a non-mixed saved script before
  the existing custom-id repair, so a legacy save loads into the automatic
  engine. A mixed legacy save keeps its derived `true`.
- The language catalogs get `error.78` (`Сейчас не ночь.`) and `error.79`.

### Test plan

New `src/core/engine/lifecycle.test.ts`:

- table completeness and valid phase values for all 47 command types;
- `lifecycleGuard` rejection per policy and no rejection for `"any"`;
- one full real cycle `setup -> deal -> seat -> night -> day -> night -> over`;
- `endNight` rejected in `day` with `error.78` and canonical state unchanged
  across Validate, Preview and Apply;
- `dealGame` rejected in `night` with `error.47` and unchanged state;
- a play command after `over` rejected with `error.6` and unchanged winner;
- `bagUpdate` phase patch outside setup rejected with `error.47`;
- a roster reset from `night` returns to `setup`; a bag edit without the reset
  is rejected in `night` and leaves the game unchanged;
- the same `endDay`/`endNight` verdict for TB, BMR and S&V states and for a
  manual-only mixed pool.

Extend `manual.test.ts` and `state.test.ts`:

- same-edition script with `manualOnly: true` is rejected and leaves the script
  unchanged;
- same-edition script without the flag keeps the automatic queue and win check;
- `validateState` rejects a single-edition script with the flag;
- `normalizeScriptState` clears a stray legacy flag.

## Risks / Trade-offs

- Wrong-phase calls now report the phase code instead of a downstream
  object-not-found code. No asserted test depends on the old codes; the UI
  translates `error.78` like every other engine code.
- `startNight` on a fresh `setup` state now returns `error.68` instead of
  `error.34`. The app never calls it there; `startGame` owns that path.
- Removing the duplicated preambles changes no valid call. Direct engine
  callers (demo, tests) keep the same verdicts because every handler calls the
  guard itself.
- A hand-written same-edition script with `manualOnly: true` is now rejected on
  import. This is the intended boundary; a legacy save is normalized rather
  than rejected.
- The command matrix is a second list beside the handler calls. The
  completeness test and the type checker keep them aligned; the handler calls
  remain the enforcement point for direct engine callers.

## Alternatives considered

- XState or another state-machine library: rejected by ADR 0002 and the
  dependency rule; the phase set is six strings.
- Guard only at `runDraft`: smaller diff, but `demo.ts` and direct engine tests
  bypass it, and the existing `startNight` guard test calls the handler
  directly.
- Guard only in handlers: no single auditable table for "which command may run
  in which phase".

# Design

## Context

See `proposal.md` for motivation. The current implementation stores a Pukka
poison and a `pukka-death` effect with a `resolve` night, applies a new poison,
then resolves the previous pending death in `completeBmrStep`. `effectActive`
recurses through poison effects that target the source of another poison, so a
mutual poison can overflow the stack. Commands run on a clone in `runDraft`;
validation, preview and apply share that path. Import uses `validateState` in
`js/model.js` and leaves the current game untouched when validation fails.

Constraints:

- The engine remains DOM-free, storage-free and dependency-free.
- Schema v4 saves must keep loading; new effect fields are optional.
- Preview and apply must agree for the same initial state.
- The work stays on the PR #24 branch; no merge is performed.

## Goals / Non-Goals

**Goals:**

- Produce the documented Pukka self-target outcome.
- Make poison activity deterministic and independent of `state.effects` order.
- Return `CYCLIC_EFFECT_DEPENDENCY` from command and import paths.
- Prove each behavior with RED → GREEN tests and keep the rules matrix current.

**Non-Goals:**

- A general event graph or arbitrary cyclic-effect support.
- Reworking every effect role or adding a new UI flow.
- Resolving cycles by guessing a gameplay rule.
- Merging, opening another pull request or changing the save schema version.

## Decisions

### 1. Chronological poison resolution in a shared helper

Add a pure helper, for example `js/effect-graph.js`, used by `js/engine/effects.js`
and by `js/model.js` during import validation. The helper takes the state and
the current game time and returns either the active effect ids or a typed
failure.

Resolution order:

1. Drop effects that are structurally inactive: `active === false`, expired,
   missing or dead source, or a source whose role is `drunk`.
2. Group poison effects by `cycleOf(start)`. A poison created while its source
   was already impaired by an earlier group is creation-invalid.
3. Within one group, build an edge from poison F to poison E when F targets
   E's source. Resolve the group in topological order; a group cycle is an
   unresolvable dependency and returns `CYCLIC_EFFECT_DEPENDENCY`.
4. Re-evaluate current activity in the same topological order, so a poison
   created by a source that is currently impaired is inactive. A cycle that
   survives creation filtering also returns `CYCLIC_EFFECT_DEPENDENCY`.
5. Sort ties by `start` and effect id, never by array position.

`effectActive` and `isImpaired` read the resolved set instead of recursing.
When the helper fails, `isImpaired` returns `true` as a defensive display
value, but command and import paths reject before relying on it.

Alternative rejected: catching `RangeError` from the recursive walk. It hides
the cause, depends on engine stack size and cannot distinguish a cycle from a
deep chain.

### 2. Typed rejection in the command pipeline

`runDraft` calls the helper after the command mutator and before
`checkInvariants`. On failure it returns a rejected outcome with
`errorCode: "CYCLIC_EFFECT_DEPENDENCY"`, the involved effect ids in `errors`,
and the original state as the draft. `validateCommand`, `previewCommand` and
`applyCommand` therefore return the same code and leave the state unchanged.

`checkInvariants` keeps its existing checks; the effect-graph result is a
separate typed outcome because invariants are string lists.

### 3. Pukka self-target state machine

The effect model gains two optional fields on `pukka-death`:

- `suspended`: `"self-target"` or `"impaired"`;
- `resumeOnHealthy`: `true` only for a self-target suspension.

`completeBmrStep` keeps the existing order: apply the new poison, then decide
the previous death.

- **Self-target (new).** Mark the previous pending death
  `suspended: "self-target"`, `resumeOnHealthy: true`, keep its due night, and
  deactivate the previous Pukka poison so the victim is healthy. Do not call
  the death resolver in this step.
- **Impaired Pukka.** Mark the due pending death `suspended: "impaired"` and
  apply no new poison.
- **Normal step.** Resolve the due pending death that is not
  `resumeOnHealthy`; self-target suspensions are left to the resume hook.

`resolveSuspendedPukkaDeaths(state, at)` runs at the end of every successful
draft. It resolves `resumeOnHealthy` deaths whose source is now healthy
through `kill`, clears the paired effects and calls `checkWin`. This gives the
"immediately when healthy" outcome for a self-target victim and leaves the
impaired-Pukka behavior on the next Pukka step, as the official wiki describes.

When a healthy Pukka later chooses B, the step applies B's poison first and
then resolves the Pukka's own due pending death, so the Pukka dies as the
previously poisoned target. Normal protection applies to every resolved death.

Alternative rejected: resolving the self-target victim on the next Pukka step.
The owner decision and the documented Pukka × Pukka interaction require the
victim to die as soon as the Pukka becomes healthy.

### 4. Import and load rejection

`js/model.js` runs the same chronology-aware cycle check after structural
validation. `importGame` returns
`{ ok: false, error: ..., errorCode: "CYCLIC_EFFECT_DEPENDENCY" }` before the
store copies anything. `store.importGame` therefore keeps both the in-memory
game and the storage key unchanged. `load()` treats a cyclic saved state as a
corrupt save: it reports the failure, keeps the raw value under the existing
timestamped backup key and never writes a replacement.

A valid sequential mutual poison is not a cycle: the later poison is
creation-invalid, so the state loads and the earlier poison stays active.

## Risks / Trade-offs

- **Effect id collisions** → The Pukka ids already include the source and night;
  new fields do not change ids, and the resolver sorts by id only as a tie-break.
- **Old saves without the new fields** → `suspended` and `resumeOnHealthy` are
  optional; absent values mean "not suspended".
- **A cycle appears in a state that the UI already shows** → The command path
  rejects before commit, and load/import report a failure; the UI never receives
  a committed cyclic game.
- **Immediate resume inside an unrelated command** → The resume hook runs only
  for `resumeOnHealthy` deaths and only while the source is healthy. Normal
  pending deaths are unaffected, so the drunk-Pukka "dies after the next attack"
  behavior stays.
- **Win checks after a resumed death** → The hook calls the same `checkWin`
  used by `finishStep`; preview reports the same winner.

## Migration Plan

No schema version change. Existing saves load with the new fields absent.
Deployment is the normal PR #24 branch update; rollback is the previous commit.
The generated `sw.js` is refreshed after the runtime change.

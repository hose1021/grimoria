# Design

## Context

See `proposal.md` for motivation. The implementation stores poison and delay
effects on `state.effects` and resolves them through `js/effect-graph.js`.
The first version grouped poison effects by creation time and evaluated only
earlier groups, so a later poison could not suspend an earlier effect and drunk
effects ignored their source. Commands run on a clone in `runDraft`;
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
- Make poison and drunk activity deterministic and independent of
  `state.effects` order.
- Respect effect start and expiry boundaries, impaired sources, simultaneous
  poison/drunk, and Pukka recovery after mixed impairment.
- Return `CYCLIC_EFFECT_DEPENDENCY` from command and import paths.
- Prove each behavior with RED → GREEN tests and keep the rules matrix current.

**Non-Goals:**

- A general event graph or arbitrary cyclic-effect support.
- Reworking every effect role or adding a new UI flow.
- Resolving cycles by guessing a gameplay rule.
- Merging, opening another pull request or changing the save schema version.

## Decisions

### 1. Unified poison/drunk dependency graph

`js/effect-graph.js` resolves both `poison` and `drunk` effects. A helper
`resolveAt(state, at, candidates)`:

1. Drops effects that are inactive, not started, expired, or have no valid
   source. A poison needs a living source; a drunk effect may keep a dead
   source for an on-death ability such as the Sweetheart. A source whose role
   is `drunk` is never valid.
2. Starts `impaired` with role-`drunk` players.
3. Builds a dependency edge F -> E when F targets E's source and F is not E.
   Self-target effects have no self-edge.
4. Topologically sorts all candidates, with `start` and id as deterministic
   tie-breaks. A cycle returns `CYCLIC_EFFECT_DEPENDENCY`.
5. Walks the order: if the source is impaired, the effect is inactive; else it
   is active and its target joins `impaired`. A dead-source drunk effect skips
   the impairment check, so the Sweetheart's effect survives.

Creation validity uses the same resolver. For each effect with a `start`, the
engine resolves only effects with a strictly earlier start at that time. If
the source is impaired then, the effect is creation-invalid and is removed
before the current-time resolution. A cycle in that historical view is also
unresolvable and returns the typed error.

Start/end:

- not started: `cycleOf(start) > cycleOf(at)`;
- expired: `expires` exists and `cycleOf(at) >= cycleOf(expires)`.

`effectActive` checks the general start boundary and reads `activePoison` or
`activeDrunk`; non-impairing effects read `impaired` for their source.
`isImpaired` reads the same `impaired` set.

This replaces the earlier "earlier group only" order. A later effect that
targets the Pukka's source now suspends the Pukka's earlier poison; creation
validity still prevents an effect created while its source was already
impaired from taking part.

Alternative rejected: keeping group order and adding a second pass. It would
still depend on array order and would hide genuine cycles.

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

### 4. Pukka recovery under mixed impairment

`resolveSuspendedPukkaDeaths` reads `effectActive` for the pending death, which
now uses the unified graph. A Pukka impaired by a later poison, a drunk effect,
or both keeps its earlier poison and pending death suspended. The resume hook
fires only when the last impairing effect is gone. This covers self-poison plus
external poison/drunk and a later poison on the Pukka.

### 5. Import and load rejection

`js/model.js` runs the same unified graph after structural validation. `importGame` returns
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
  a committed cyclic game. `effectActive` and `isImpaired` return false when the
  graph fails, but those paths are defensive only.
- **Historical creation checks** → The resolver runs once per effect over a
  small earlier set; the effect count per game is small, so the quadratic cost
  is acceptable.
- **Dead-source drunk effects** → A dead source keeps its drunk effect active
  so the Sweetheart's on-death ability survives. A future role that needs the
  source alive can add an explicit flag; changing that now would break the
  Sweetheart.
- **Later poison on the Pukka** → The unified graph suspends the Pukka's earlier
  poison and pending death. A genuine dependency cycle still returns the typed
  error instead of guessing.
- **Start and expiry boundaries** → Both use `cycleOf`; an effect is inactive
  at the expiry cycle and before its start cycle.
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

# Design

## Context

`createGameStore` (`src/application/store/create-game-store.ts`) keeps the game
in one live object, validates and applies every mutation through
`applyCommand` (`src/core/engine/commands.ts`) and persists after each accepted
command. History is a twelve-slot ring of cloned `ValidatedState` snapshots: it
can restore a copy but cannot explain the state, and `docs/rules-matrix.md`
defect 5 records that the replay invariant is unmet.

The command engine already has the determinism this change needs:

- a command id is bound to a canonical fingerprint of type, payload and
  ruleset version (`fingerprintOf`);
- `resolveTimestamp` pins the clock per command and `withClock` makes
  `nowIso()` deterministic;
- `withDeterminism` replaces `Math.random` with a generator seeded from
  `id | fingerprint | hash(canonical state)`;
- `state.applied` is the idempotency ledger and a rejected command runs on a
  discarded draft.

`state.log` is the narrative console feed rendered by
`src/ui/screens/table/frame.tsx`; it is not a command history.

## Goals / Non-Goals

**Goals:**

- Record accepted commands in a deterministic journal with the canonical
  fingerprint, the host payload, the pinned timestamp and the ruleset version.
- Rebuild the saved state from the journal with the same seeded PRNG and clock.
- Drive undo and redo from the journal with a dependency check.
- Keep a rejected command out of the journal and make a repeated id idempotent.

**Non-Goals:**

- Changing the schema version, the game key, the domain events or the UI.
- Replaying a command that was never accepted, or resurrecting history from the
  narrative `state.log`.
- Merging the pull request.

## Decisions

### 1. The journal is a new `state.journal` field, not `state.log`

Issue #30 writes `replay(state.log)`. In this codebase `state.log` is the
narrative log (`LogEntry[]`) that the console renders, and `canonicalState`
deliberately excludes it. Reusing it would mix a presentation feed with replay
input and force the read-model screen to filter it. The command journal is
therefore `state.journal`, a `{ base, entries }` record; `replay(state.journal)`
is the issue's `replay(state.log)` and the delta spec states it that way.

### 2. One base state plus ordered entries replaces the snapshot ring

`state.journal.base` is the state just before the first recorded command and
`state.journal.entries` is the ordered command list. This is one snapshot, not
twelve, and it is the minimum input `replay` cannot derive from the commands
alone. A save written before this change has no journal; `importGame` gives it
an empty journal and keeps `state.log`, so no history is lost. The first
command after loading starts the base at the loaded state, which matches the
old in-memory undo behavior.

### 3. The journal stores inputs, not PRNG state

An entry stores `id`, `type`, `payload`, `at`, `rulesetVersion`, `fingerprint`
and `undoable`. The seed is derived again during replay from the same
`id | fingerprint | canonical state` text the live apply used, and `at` pins the
clock, so neither the generator state nor the wall clock needs to be stored. The
payload is the host's chosen option object, so a Storyteller choice is part of
the input rather than a hidden side effect.

### 4. Undo removes one entry and replays the rest

Undo finds the last undoable entry at or above the load floor, removes it and
replays the remaining journal. Redo re-inserts the entry at its recorded index
and replays. If a remaining entry no longer applies — a later command depended
on the removed one — the replay returns `journal-dependency` with the entry id
and the store leaves the state untouched. Non-undoable commands (`setNotes`,
`setReviewOpen`, `normalizeSecrets`) stay in the journal so replay still
reproduces them, but undo steps over them instead of reverting them.

The load floor keeps the old user-visible behavior that an adopted cross-tab
save clears undo history: the journal is persisted for replay, but entries that
arrived with the load are not offered to undo.

### 5. The applied ledger stays the idempotency gate

`state.applied` already binds an id to its fingerprint. The journal is checked
as a second gate because `record: false` commands (notes, review, secret
normalization) do not enter the ledger; without the journal check a repeated
`setNotes` would append twice. A repeated id with the same fingerprint returns
`idempotent` and appends nothing; a different fingerprint is
`command-id-conflict`; a rejected command appends nothing because the journal is
written only after the draft commits.

### 6. `run(mutator)` keeps one snapshot

`store.run` is a legacy escape hatch that mutates the live object directly; an
arbitrary mutation cannot be expressed as a command, so it keeps one
pre-mutation snapshot and starts a fresh journal with the new state as its base.
Screens already do not call it.

## Risks / Trade-offs

- **Save size** grows by one base state plus the command list. It is bounded by
  the number of accepted commands and is much smaller than the old repeated
  snapshots; the base is stored once, not per step.
- **Journal corruption** is possible in a hand-edited save. `replay` returns a
  typed `journal-invalid` / `journal-dependency` result instead of throwing, and
  undo refuses rather than partially applying.
- **Commands whose outcome depends on external input** must carry that input in
  the payload. The existing command contract already requires it for host
  choices; a future command that reads outside the payload would break replay
  and must be caught by the replay test.
- **Old saves** have no command history to replay; only the state and the
  narrative log are preserved. This is unavoidable: the commands were never
  recorded.

## Migration Plan

No schema bump. A v4 save without `journal` loads with `{ base: null, entries:
[] }` and its narrative log unchanged; the next accepted command records the
base. Rollback is the previous commit; a save written by this change still
validates on the previous code because unknown fields are ignored by
`validateState`.

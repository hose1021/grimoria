# Design

## Context

Measured on `origin/dev` at `6ed98c6`; the pipeline files are identical to
`origin/main` at `0a2934078bd0`.

`createGameStore` already owns one transaction: prepare, validate, draft apply,
invariants, persist, publish. `dispatch`, `undo`, `redo` and `run` call
`persist(false)`, restore the pre-command clone, then call `markFailed` once.
`runReplacement` did not: it called `persist()` with `markFailing = true`, so a
failed write published the replacement before the rollback.

Record-only commands (`setNotes`, `setReviewOpen`, `normalizeSecrets`) set
`undoable: false` and `record: false`. Their idempotency record was the journal
entry, while `recordJournalEntry` replaces consecutive entries of the same type.
The older id disappeared, so a retry applied again.

## Decisions

### Replacement operations use the same failure path

`runReplacement` persists with `persist(false)`, restores the state and
`undoFloor`, then calls `markFailed` once. This is the existing `dispatch`
order, not a new transaction boundary. On success the behavior is unchanged:
one write, one saved publish, cleared redo and legacy undo.

### Every accepted command enters the applied ledger

`applyCommand` records `state.applied[command.id]` for every accepted command.
The `record` option is deleted because no command needs it after this change.
The journal still coalesces consecutive non-undoable entries of one type, so 300
notes keystrokes remain one replayable entry, but each command id stays
idempotent.

`state.applied` is an idempotency ledger, not domain state. Replay reproduces
the canonical game and domain events; it does not rebuild applied entries whose
journal entries were coalesced. The existing coalescing test now compares
`canonicalState` instead of the full serialized object, and says why.

Undo and redo replay a journal slice. They carry the accepted applied entries
from the live state into the replayed state, then remove the id of the entry
that undo removed. An accepted coalesced id therefore stays idempotent across
undo, redo, save and reload. An undone id leaves the ledger and applies again as
a new action; redo restores it. `reset` and `importGame` replace the ledger with
the new game's ledger, and `newGame` starts from an empty one.

The ledger has one entry per accepted command and is not evicted. Undo removes
the undone entry; a history reset replaces the ledger. This is linear in
accepted commands by design: evicting an accepted id would silently break its
idempotency contract.

Trade-off: a notes session adds one applied entry per command instead of none.
The journal remains coalesced.

### Compact persisted identity

Recording every accepted command first exposed the full canonical fingerprint
in `state.applied`. That fingerprint is the serialized
`{type, payload, rulesetVersion}`, so 4,000 growing `setNotes` values produced a
9,125,844-byte state: 779,433 bytes at 1,000; 2,553,933 at 2,000; 9,102,933 at
4,000.

The execution seed, preview timestamp key, journal entry and prepared command
keep the full fingerprint. The persisted applied entry stores a compact
`identity` instead: four 32-bit FNV-1a digests of the canonical fingerprint,
rendered as 32 hex characters. The digest is deterministic across engines and
commands, but it is an idempotency key, not a security hash. A collision would
only weaken the same-id conflict check; the seed and replay are unaffected.

`storedCommand` compares the compact identity for new entries and the full
`fingerprint` for legacy entries. A legacy entry is not rewritten on load. New
entries omit `fingerprint`; the journal still carries it for replay and for the
legacy journal fallback. The measured state is 208,951 bytes at 1,000; 412,951
at 2,000; 820,951 at 4,000.

The alternative was a compact identity inside the journal entry or a separate
alias list, which would grow the journal and change the v4 shape more. The
optional `identity` field keeps `pg.game.v4` readable by this version without a
schema bump; old entries remain valid, but their full fingerprints are not
automatically purged.

### No per-command expected revision

ADR 0002 §4 is accepted and says the expected version is the command
`rulesetVersion` plus the saved schema version, with no optimistic
game-revision precondition. The store already refuses a write when the raw
`pg.game.v4` value differs from its loaded or last written snapshot. That
detects a sequential stale tab.

The read, compare and write are separate operations. Two tabs can read the same
old value before either writes; both pass the check and the later write wins.
A per-command `expectedRevision` field alone would not close that race, because
it still needs an atomic read-check-write. Web Locks or IndexedDB are a separate
architecture decision and are out of scope here.

The truthful contract is documented in ADR 0002 and `SPEC.md`: sequential stale
writes are refused; simultaneous multi-tab writes are last-writer-wins. #213's
acceptance text needs the owner to adopt that contract explicitly, because the
issue still lists `expected state version`. This change prepares the text but
does not edit the issue.

## Risks

- Applied-ledger growth for record-only commands. Bounded by user actions; the
  journal and save schema do not change.
- A caller that expected replay to reproduce the applied ledger exactly. The
  specification only requires canonical state and events; the changed test
  documents the boundary.
- A future multi-tab requirement needs a separate concurrency design. This
  change does not claim it.

## Migration

No schema, `pg.game.v4`, journal-field, payload or ruleset-version change. Old
saves load with their existing applied ledger. Replay of old journals is
unchanged; a missing applied entry still falls back to the journal entry. A
record-only id that an older save already coalesced has no applied record, so a
retry of that specific old id can still apply; new commands record their ids.

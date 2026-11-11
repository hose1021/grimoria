# Design

## Context

`checkInvariants` in `src/core/engine/commands.ts` runs on every draft in
`runDraft`, and a violation rejects the command atomically. `validateState` in
`src/core/model/state.ts` guards the save/import boundary. The five invariants
in issue #32 overlap both layers, so the tests drive the public command API and
assert both state and the invariant report.

## Decisions

### One test per invariant, table-driven where the cases share a shape

`js/invariants.test.mjs` has five `test(...)` calls whose names are the
invariant sentences. Corruptions and role rules are tables, so a new case is a
row, not a new test.

### Missing player references belong in `checkInvariants`

A dangling nomination, morning death, day execution, Butler master, Mastermind
record or setup reference (`herringId`, `grandmotherId`, `evilTwin*PlayerId`)
was accepted by the application gate. The fix adds those checks to the existing
function; nominations and the Mastermind player are also checked at the save
boundary in `validateState`, so an imported save cannot carry them either. No
new abstraction and no change to command behaviour.

### Replay is the recorded command/event journal, not a production reducer

No event reducer exists (`docs/rules-matrix.md` records event-log replay as
unsupported, target PR-02B). The invariant is therefore tested where the engine
already has the pieces: the test records every applied command, its derived
events and the pre-command snapshot, then replays the journal into the initial
state with the same pinned timestamps. It asserts canonical-state equality and
byte-equal event streams. Undo is modelled exactly as the store performs it —
restoring the recorded snapshot — and the undone command is replayed; a repeated
command id is re-applied and must stay idempotent. A standalone `replay(events)`
reducer remains out of scope and is not claimed.

### Effect-source endings are read from the role rule in the repo

`docs/rules-sources.md` pins the rules the tests assert: Poisoner poison and
Monk protection end when the source dies, a dead-source Sweetheart drunk stays
active, a Philosopher-granted drunk ends when the Philosopher dies, and the
Snake Charmer's poison is permanent. The test table cites those rules rather
than assuming one general source-death policy.

### Determinism

Every replayed command carries an explicit `at` timestamp, so the controlled
clock and the seeded PRNG produce identical effect, death and log identities.

## Risks

- `checkInvariants` is also used by existing suites; the new checks only reject
  references that the engine never produces, so legal play is unchanged.
- Event replay is intentionally scoped to the command journal; a future event
  reducer must keep the recorded events derivable from the same commands.

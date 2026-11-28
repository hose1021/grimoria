# Design

## State

`grimoria-domain::state::State` wraps one `grimoria_wire::Value::Object`. It
reads and replaces top-level fields by name; every unknown field, nested value,
array order and UTF-16 string remains untouched. Serialization uses the Phase 1
wire encoding, so integer-like keys follow ECMAScript enumeration.

## Command preparation

The host supplies `{ timestamp, seed, id }`. A command may omit its id or at;
the missing value comes from those inputs. `seed` is reserved for later
slices and does not affect `setNotes`. Preparation validates:

- a non-empty id;
- `setNotes` as the only supported type;
- an object payload with only an optional string `notes`;
- a supported historical ruleset version;
- an ISO-shaped timestamp.

The legacy canonical bytes of `{ type, payload, rulesetVersion }` are the
fingerprint. The four-salt FNV identity is computed from it with the same
64-bit-free arithmetic as TypeScript.

## Vertical slice

`validate` runs preparation and reports an allowed result or a rejection.
`preview` runs on an isolated copy and reports events, changes and future without
mutating the input. `apply` mutates the state only after preparation and
short-circuit checks pass. It records:

- `applied[id] = { type, at, rulesetVersion, identity, followUp, result,
  undoable }`;
- a journal base when absent or null, and a `setNotes` entry;
- a trailing `setNotes` entry is replaced, matching the TypeScript coalescing.

An existing id with the same identity is idempotent; different content is
`command-id-conflict`. Rejections return the original state unchanged.
Unsupported command types return `command-unknown`; reserved operations return
`command-unsupported`.

## Replay

Replay starts from the journal base, removes the existing journal, applies only
`setNotes` entries and places the journal after `applied`, matching
`placeJournal`. An unsupported or idempotent entry fails with
`journal-dependency` instead of returning a fabricated state.

## Differential acceptance

`fixtures/conformance/set-notes-cases.json` supplies cases over the committed
legacy state. `scripts/set-notes-differential.ts` runs the real TypeScript
prepare/apply/preview/replay and the generated Node WASM bindings. It compares
the complete result, state, events, fingerprints, identities and journal,
including Unicode, lone surrogates, numeric ids, absent/null payloads,
malformed/invalid commands and duplicate ids. `--inject-divergence` changes one
actual field and requires the comparator to reject it.

## Crate graph

`grimoria-wire` is pure serialization and has no workspace dependency.
`grimoria-domain` depends on `grimoria-wire`; conformance, wasm and cli keep
their existing edges. The graph check and its tests enforce the inversion.

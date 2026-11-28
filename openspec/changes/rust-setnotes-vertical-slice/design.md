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

## Supported state surface

The slice does not implement the effect graph, suspended Pukka resolution or
character mechanics. It accepts states whose effects are absent or contain no
`poison`, `drunk` or `pukka-death` effect. Every other semantic effect and all
state-invariant failures reject with `unsupported-state` before mutation. For a
supported state those TypeScript post-command steps are provably inert; the
slice never returns an allowed outcome for a state it cannot validate.

## Timestamps

Preparation keeps the supplied `at` in the prepare result, as TypeScript does,
and computes a canonical UTC `at_iso` for execution. The host timestamp is
required when the command has no `at`; an invalid host clock rejects with the
TypeScript `The clock returned an invalid date.` contract. ISO dates with
milliseconds and numeric offsets normalize to `YYYY-MM-DDTHH:MM:SS.sssZ`.

## Prepare and command contracts

`prepare` returns the exact `PrepareResult` shape (`ok`, `errorCode`, `reason`)
or a prepared command. `validate`, `preview` and `apply` return `CommandResult`
rejections. Preparation keeps TypeScript's order: command, type, payload,
fields, id, timestamp and ruleset. Whitespace-only ids, null payloads and
unknown payload fields fail with the prepare codes.

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
`placeJournal`. A missing journal, missing base or non-object base fails closed
with `journal-invalid` and leaves the input unchanged. An unsupported or
idempotent entry fails with `journal-dependency` instead of returning a
fabricated state.

## Differential acceptance

`fixtures/conformance/set-notes-cases.json` supplies cases over the committed
legacy state. `scripts/set-notes-differential.ts` runs the real TypeScript
prepare/validate/preview/apply/replay and the generated Node WASM bindings. It
compares complete results, rejected results and unchanged state, events,
fingerprints, identities, journal entries, replay events and every runtime
ruleset, including Unicode, lone surrogate ids, numeric ids, offsets,
milliseconds, malformed inputs and duplicate ids. The legacy v4 state is also
parsed and re-serialized losslessly.

Mismatch diagnostics contain only field paths and SHA-256 digests, never state
bodies, notes, role names or secrets. `--inject-divergence` changes one actual
field and requires the comparator to reject it.

## Crate graph

`grimoria-wire` is pure serialization and has no workspace dependency.
`grimoria-domain` depends on `grimoria-wire`; conformance, wasm and cli keep
their existing edges. The graph check and its tests enforce the inversion.

# Proposal

Issue: #535

## Why

Phase 1 proved the wire encoding but executes no command. Phase 2 needs the
first real vertical slice to prove that Rust and TypeScript can produce the same
command result, state, events, fingerprints, identities and journal entries
before any broader rule migration.

`setNotes` is the narrowest command: it changes one field, is allowed in every
phase, records a non-undoable entry and coalesces repeated edits.

## What Changes

- Add a lossless state wrapper that edits only `notes`, `applied` and `journal`
  and preserves every other field and string code unit.
- Add command envelope preparation, the exact legacy fingerprint and
  identity algorithms, and deterministic host inputs.
- Implement `setNotes` validate, preview, apply and replay in the domain.
- Add native Rust and compiled WASM entry points.
- Add a committed differential fixture and a Node harness that compares the
  actual TypeScript engine with the compiled WASM, including an injected
  divergence probe.
- Invert the crate edge so `grimoria-domain` owns the slice and depends on
  `grimoria-wire`; serialization no longer depends on the domain.

No role migration, production WASM loading, TypeScript gameplay change or
cutover.

## Rollback

Revert this change. Phase 1 serialization and the TypeScript engine remain the
production behavior; no saved state is written by the slice.

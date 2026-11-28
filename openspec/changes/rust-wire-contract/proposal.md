# Proposal

Issue: #535

## Why

Phase 0 fixed the versioned JSON boundary and the serialization rules but
implemented no wire code. Phase 1 must make that contract executable before any
Rust gameplay can be compared with the TypeScript engine: the same bytes must
come out of native Rust and WASM, including ECMAScript number formatting,
UTF-16 key order, absent-versus-null and lone surrogates.

The Phase 0 crate matrix forbids every external dependency. Phase 1 needs a
small, named external set to implement JSON and the WASM test harness, so the
policy must change from "none" to an explicit allowlist while keeping
`--locked --offline` resolution.

## What Changes

- Add versioned request/response DTOs and JSON Schemas for the wire boundary.
- Add a WTF-16 string type and a canonical JSON parser/serializer that match
  ECMAScript `JSON.stringify` bytes and UTF-16 key ordering.
- Add portable serialization fixtures that run in native Rust and WASM.
- Add `wasm-bindgen` exports and executable `wasm-bindgen-test` coverage.
- Extend the Cargo graph check with a per-crate external dependency allowlist.
- Add Node contract tests for the schemas and fixture identities.

No gameplay, role migration, production import, storage change or cutover.

## Rollback

Revert the Phase 1 pull request. The Phase 0 workspace, contracts and baseline
stay intact; no production path reads the wire crate.

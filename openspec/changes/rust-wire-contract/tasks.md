# Tasks

## 1. Contract

- [x] 1.1 Add `WIRE_VERSION`, request/response DTOs and the operation enum.
- [x] 1.2 Add JSON Schemas for the envelope and canonical value.
- [x] 1.3 Add Node tests that compare the schemas with the Rust DTO identities.

## 2. Serialization

- [x] 2.1 Add `Wtf16` with code-unit equality, UTF-16 ordering and safe UTF-8 output.
- [x] 2.2 Add the strict JSON parser with duplicate-key, number and version rejection.
- [x] 2.3 Add wire and canonical serializers with ECMAScript number/string rules.
- [x] 2.4 Add lone-surrogate, integer-key, absent/null, number and array vectors.

## 3. Parity

- [x] 3.1 Add `fixtures/conformance/wire-serialization.json`.
- [x] 3.2 Run the fixture natively in `grimoria-conformance`.
- [x] 3.3 Export the wire functions from `grimoria-wasm` and run `wasm-bindgen-test`.

## 4. Dependencies and CI

- [x] 4.1 Extend the Cargo graph check with the external allowlist and negative tests.
- [x] 4.2 Pin the external versions, commit `Cargo.lock`, and keep locked offline checks.
- [x] 4.3 Execute the WASM test in the `Rust wasm32` job with the matching runner.

## 5. Review hardening

- [x] 5.1 Reproduce the exact v0.14.0 TypeScript legacy canonical order, including numeric array indexes, index boundaries, nested objects, surrogate keys and the prototype-key edge; keep it versioned apart from the comparison encoding.
- [x] 5.2 Add Node differential checks against `JSON.stringify`, the real TypeScript canonicalizer, persisted fingerprints and portable identities.
- [x] 5.3 Execute the generated WASM bindings through the JavaScript boundary in the wasm32 CI job.
- [x] 5.4 Validate the full resolved Cargo graph, approved transitive name/version/source identities, lock checksums and patch/path/git/source substitutions.
- [x] 5.5 Return structured `engine-contract-violation` failures and enforce input, depth, collection and node limits with hash-based duplicate detection.
- [x] 5.6 Mark every operation implemented, reserved or unavailable in the DTO and schema.
- [x] 5.7 Reserve `prepare_command`, `query`, `public_projection`, `player_projection` and `canonical_state`; map every operation to an approved boundary section.
- [x] 5.8 Serialize Rust-generated wire objects with ECMAScript integer-index-first enumeration, with unordered, nested and boundary vectors.
- [x] 5.9 Add machine-readable `limitKind` to limit failures and synchronize the schema and native/WASM tests.

## 6. Verification

- [x] 6.1 `cargo fmt --check`, `cargo clippy -D warnings`, `cargo test --workspace`.
- [x] 6.2 `npm run verify`, strict OpenSpec, native and wasm32 checks.
- [x] 6.3 Mutation probes and immutable baseline parity.
- [x] 6.4 Record RED/GREEN evidence and update the R3 pull request.

## Evidence

- RED: `to_legacy_canonical`, limits and structured failures did not exist, so
  the new Rust tests failed to compile; the graph checker had no resolved
  package policy; the unordered numeric fixture made the wire serializer fail;
  the expanded operation inventory was absent.
- GREEN: `cargo test --workspace` 31/31; `cargo test -p grimoria-wasm
  --target wasm32-unknown-unknown` 4/4 under the Node runner; the generated
  bindings pass 15 wire and 6 legacy vectors through JavaScript, including
  `limitKind`.
- `node --test scripts/wire-contract.test.ts scripts/wire-differential.test.ts
  scripts/check-cargo-graph.test.ts` 34/34; persisted fingerprints and
  `identityOf` identities match the committed fixtures.
- `cargo fmt --all --check` pass; `cargo clippy --workspace --all-targets -- -D
  warnings` clean; full `cargo metadata --locked --offline` pass.
- `npm run verify` pass (1904 tests in the manifest, build, offline and
  acceptance); `openspec validate --changes --strict` pass.
- `npm run verification:mutation` 10/10 critical mutations detected.
- No file under `src/` imports the wire crate and no production file requests a
  WASM asset; `pg.game.v4` is unchanged.

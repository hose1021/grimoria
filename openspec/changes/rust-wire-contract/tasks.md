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

## 5. Verification

- [x] 5.1 `cargo fmt --check`, `cargo clippy -D warnings`, `cargo test --workspace`.
- [x] 5.2 `npm run verify`, strict OpenSpec, native and wasm32 checks.
- [x] 5.3 Record RED/GREEN evidence and open the R3 pull request.

## Evidence

- RED: the first WASM runner invocation rejected the `run_in_node` macro; the
  graph check had no external allowlist; the wire crate and fixture did not
  exist.
- GREEN: `cargo test --workspace` 21/21; `cargo test -p grimoria-wasm
  --target wasm32-unknown-unknown` 2/2 under the Node runner;
  `node --test scripts/wire-contract.test.ts scripts/check-cargo-graph.test.ts`
  24/24.
- `cargo fmt --all --check` pass; `cargo clippy --workspace --all-targets -- -D
  warnings` clean; `cargo metadata --no-deps --locked --offline` pass.
- `npm run verify` pass (183 explicit Node checks, build, offline, acceptance).
- `openspec validate --changes --strict` 9/9 changes.
- No file under `src/` imports the wire crate and no production file requests a
  WASM asset; `pg.game.v4` is unchanged.

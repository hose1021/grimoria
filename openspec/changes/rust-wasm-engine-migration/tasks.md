# Tasks

## 1. Decision and inventory

- [x] 1.1 Add ADR 0006 with the boundary, ownership, wire, serialization, oracle, wasm and cutover decisions.
- [x] 1.2 Extend `contracts/engine-boundary.json` to version 2 with the full surface and contracts.
- [x] 1.3 Derive inventory counts from source in `scripts/engine-boundary.test.ts`.

## 2. Workspace

- [x] 2.1 Add `Cargo.toml`, `rust-toolchain.toml`, `Cargo.lock` and five empty crates.
- [x] 2.2 Add `scripts/check-cargo-graph.ts` and its positive/negative tests.
- [x] 2.3 Run `cargo fmt --check`, `cargo clippy -D warnings`, `cargo test --workspace` and the wasm32 build.

## 3. Baseline

- [x] 3.1 Add `scripts/engine-benchmark.ts` with command, replay, JSON, memory, bundle and startup metrics.
- [x] 3.2 Commit `docs/audits/engine-baseline.json` from the same harness.
- [x] 3.3 Add `bench:engine`, `graph:cargo` scripts and run the graph check in verify.

## 4. CI and gates

- [x] 4.1 Add native Rust and wasm32 CI jobs without removing existing jobs.
- [x] 4.2 Run `npm run verify`, strict OpenSpec and the new Node suites.

## Evidence

- RED: no workspace or graph check existed; an extra `grimoria-domain → grimoria-wire`
  edge and a cycle were accepted by nothing.
- GREEN: `node scripts/check-cargo-graph.ts` passes on the five-crate matrix and
  its four tests reject an extra edge, a cycle and a non-workspace dependency.
- `cargo test --workspace` 4/4; wasm32 build for the four libraries.
- `PLAYWRIGHT_MODULE=… node --expose-gc scripts/engine-benchmark.ts --write
  docs/audits/engine-baseline.json` produced the committed baseline.
- `node --test scripts/engine-boundary.test.ts` 6/6.

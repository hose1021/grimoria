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

## 5. Phase 0 review hardening

- [x] 5.1 Separate benchmark warm-up and measured workloads; assert command identities and record environment, fixture hash and state metadata.
- [x] 5.2 Reconcile ADR 0006 budgets with the corrected baseline measurements.
- [x] 5.3 Replace manifest regex parsing with `cargo metadata` and cover renamed, target, dev, build, optional and workspace-inherited dependencies.
- [x] 5.4 Record exact error-code and ruleset identities and assign every core error code to one layer.

## Evidence

- RED: the benchmark warmed on measured identities; the graph test accepted an
  extra edge through a renamed, target, dev, build, optional or workspace
  declaration; the boundary named no exact error or ruleset identity.
- GREEN: `node --test scripts/engine-benchmark.test.ts` 6/6 passes; the
  corrected baseline records disjoint warm-up and measured identities.
- `node scripts/check-cargo-graph.ts` passes on the five-crate matrix, and
  `node --test scripts/check-cargo-graph.test.ts` 16/16 rejects an extra edge, a
  cycle, an external package and an unauthorized edge in every dependency form.
- `cargo test --workspace` 4/4; wasm32 build for the four libraries.
- `PLAYWRIGHT_MODULE=… node --expose-gc scripts/engine-benchmark.ts --write
  docs/audits/engine-baseline.json` produced the committed baseline.
- `node --test scripts/engine-boundary.test.ts` 7/7.

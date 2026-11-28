# Proposal

Issue: #535

## Why

The approved Rust/WASM architecture needs a reviewable Phase 0 before any
gameplay implementation: a pinned toolchain, an empty five-crate workspace, a
complete engine boundary, a dependency-direction check, a reproducible
TypeScript baseline and explicit wire/serialization/lifecycle contracts. Without
these, later role batches would invent the boundary while porting.

## What Changes

- Add ADR 0006 and this OpenSpec change.
- Add `Cargo.toml`, `rust-toolchain.toml`, `Cargo.lock` and five empty crates.
- Add `scripts/check-cargo-graph.ts` and its tests; run it in verify and CI.
- Extend `contracts/engine-boundary.json` to version 2 with the full surface,
  ownership, error layers, serialization and lifecycle contracts.
- Add `scripts/engine-benchmark.ts` and `docs/audits/engine-baseline.json`.
- Add native and wasm32 Rust CI jobs.

No production engine, storage, UI or saved-state change. TypeScript remains the
sole production engine; no WASM asset is loaded.

## Out of Scope

Rust gameplay, role migration, adapter cutover, new characters, rule fixes,
performance optimizations and any unrelated refactor.

# Tasks

## 1. State and command

- [x] 1.1 Add the lossless `State` wrapper and preserve unknown fields.
- [x] 1.2 Add command preparation, supported rulesets and host inputs.
- [x] 1.3 Add the legacy fingerprint and identity algorithms.

## 2. Slice

- [x] 2.1 Implement `setNotes` validate, preview, apply and rejection.
- [x] 2.2 Record events, applied identity and coalesced journal entries.
- [x] 2.3 Implement slice replay and explicit unsupported failures.

## 3. Entry points

- [x] 3.1 Export native Rust functions and compiled WASM exports.
- [x] 3.2 Add the legacy fixture round-trip and differential harness.
- [x] 3.3 Add the injected divergence gate.

## 4. Graph and CI

- [x] 4.1 Invert the domain/wire edge and update graph tests.
- [x] 4.2 Run the WASM differential in CI.

## 5. Verification

- [x] 5.1 `cargo test --workspace`, clippy and fmt.
- [x] 5.2 WASM tests, differential, `npm run verify`, strict OpenSpec.
- [x] 5.3 Mutation probes and immutable baseline parity.

## Evidence

- RED: the slice, lossless state, host inputs and WASM entry points did not
  exist; the first differential run found future effect projections and replay
  journal placement different from TypeScript.
- GREEN: `cargo test --workspace` 35/35; `cargo test -p grimoria-wasm
  --target wasm32-unknown-unknown` 4/4.
- `node scripts/set-notes-differential.ts --module ... --inject-divergence`
  passes 9 cases and detects the changed field.
- `npm run verify` pass (193 explicit Node checks, 1904 manifest tests);
  `openspec validate --changes --strict` 10/10.
- `cargo fmt --all --check` pass; `cargo clippy --workspace --all-targets -- -D
  warnings` clean; full locked `cargo metadata` graph check pass.
- `npm run verification:mutation` 10/10 critical mutations detected.
- No file under `src/` changed; `pg.game.v4` and the TypeScript production
  engine are unchanged.

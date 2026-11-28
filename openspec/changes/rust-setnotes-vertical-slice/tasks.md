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

## 6. Review hardening

- [x] 6.1 Restrict the supported state surface, reject impairing/Pukka effects and invariant failures, and keep TypeScript post-command steps inert for supported states.
- [x] 6.2 Fail replay closed with `journal-invalid` versus `journal-dependency` and preserve the input state.
- [x] 6.3 Normalize timestamps through the host boundary, keeping the supplied prepare value and canonical UTC execution value.
- [x] 6.4 Separate `PrepareResult` and `CommandResult`, preserving precedence, whitespace ids and null payloads.
- [x] 6.5 Build event ids from UTF-16 units and cover lone-surrogate ids.
- [x] 6.6 Compare prepare/validate/preview/apply rejections, unchanged state, idempotent state, sequential coalescing, replay events, every runtime ruleset, unknown fields and the legacy v4 round-trip.
- [x] 6.7 Exclude inactive effects from delayed projections and add effect fixtures.
- [x] 6.8 Replace raw diagnostics with paths and SHA-256 digests and add a privacy regression.
- [x] 6.9 Correct the runtime ruleset inventory to 15 including `tb-bmr-snv-2026-11-17.4`.

## Evidence

- RED: the first expanded differential found unsupported state states accepted,
  replay error text/class differences, host-timestamp reason differences and
  future projections that included inactive effects.
- GREEN: `cargo test --workspace` 35/35; `cargo test -p grimoria-wasm
  --target wasm32-unknown-unknown` 4/4.
- `node scripts/set-notes-differential.ts --module ... --inject-divergence`
  passes 41 checks and detects the changed field.
- `npm run verify` pass (194 explicit Node checks, 1905 manifest tests);
  `openspec validate --changes --strict` 10/10.
- `cargo fmt --all --check` pass; `cargo clippy --workspace --all-targets -- -D
  warnings` clean; full locked `cargo metadata` graph check pass.
- `npm run verification:mutation` 10/10 critical mutations detected.
- No file under `src/` changed; `pg.game.v4` and the TypeScript production
  engine are unchanged.

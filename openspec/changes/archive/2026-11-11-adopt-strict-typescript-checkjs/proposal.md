# Proposal

Issue: #50

## Why

The domain contract is held together by convention: the state schema v4,
38 command types, effect records, and store persistence have no compile-time
shape. A refactor can rename a field or widen a result union while 201 runtime
tests still pass. JSDoc and `tsc --noEmit` give the same checks a browser
application already relies on, without a bundler or a runtime change.

## What Changes

- Add a development-only TypeScript toolchain: `package.json`, lockfile,
  `tsconfig.json` with `allowJs`, `checkJs`, `strict` and `noEmit`.
- Add shared JSDoc contracts for `GameState`, `Player`, `Script`, `Command`,
  `CommandResult`, `Event`, `Effect`, and store operations.
- Annotate the core in small stages: `model.js`, the command
  Validate/Preview/Apply path, `effects.js` and the effect graph, then
  `store.js`.
- Extend the checked set to the remaining domain modules and the UI screens in
  separate stages.
- Add compile-time contract tests for command-result narrowing and invalid
  shapes.
- Add a `typecheck` CI job. No emitted files, no bundler, no runtime
  dependency.
- Regenerate `sw.js` after each stage because JSDoc changes asset bytes and the
  offline cache id.

## Capabilities

### New Capabilities

- `app/static-types`: the durable contract for strict JavaScript type checking,
  the CI gate, and the no-runtime-change guarantee.

### Modified Capabilities

None. Game behavior, state schema v4, storage keys, GitHub Pages paths and the
offline protocol do not change.

## Impact

- Runtime source: `js/model.js`, `js/engine/commands.js`,
  `js/engine/effects.js`, `js/effect-graph.js`, `js/store.js`,
  `js/engine.js`, `js/engine/**`, `js/rules.js`, `js/scripts.js`, then UI
  modules in staged batches.
- New files: `js/types.d.ts`, `js/types.test-d.ts`, `tsconfig.json`,
  `package.json`, `package-lock.json`.
- CI: `.github/workflows/ci.yml` gains a type-check job.
- Offline: `sw.js` is regenerated; the update protocol is unchanged.
- Tests: existing 201 tests remain the runtime baseline; type checks add a
  compile-time gate.
- No branch, PR, merge or runtime change in this planning step.

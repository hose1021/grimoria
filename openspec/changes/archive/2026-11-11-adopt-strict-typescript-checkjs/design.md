# Design

## Context

See `proposal.md` "Why". The runtime is plain ESM with no package manager,
bundler or build step. Domain modules are DOM-free; screens read the singleton
`state` and dispatch commands. Tests run directly on source with
`node --test js/*.test.mjs` (201 tests). `sw.js` is generated from runtime asset
bytes by `scripts/build-offline.mjs`, so any JSDoc edit changes the cache id.
CI has a unit job and a Playwright job; Pages stages only runtime files.

Constraints:

- No runtime behavior, schema v4, storage key, export format, Pages path or
  offline protocol change.
- Tests must keep running without a build.
- The type gate must not add a runtime dependency or emit JavaScript.
- Changes must stay reviewable in small stages.

## Goals / Non-Goals

Goals:

- A strict, check-only TypeScript gate in CI over an expanding set of runtime
  files.
- JSDoc contracts for the state, command, effect and store boundaries.
- Compile-time contract tests for the command result union.
- A documented policy for type suppressions.

Non-goals:

- Moving runtime files to `.ts`, transpiling, bundling, Vite, or Rust.
- Changing tests to import built output.
- Enabling `noUncheckedIndexedAccess` or other extra strictness flags in the
  first pass.
- Adding `"type": "module"` to `package.json`; Node's existing behavior stays.
- Changing Pages deployment, service worker behavior or saved games.

## Decisions

### 1. Dev-only TypeScript, no emit

Add a private `package.json` with a pinned `typescript` devDependency and a
`typecheck` script (`tsc --noEmit`), plus `package-lock.json`. CI runs
`npm ci` and the script.

Alternatives:

- `npx typescript` in CI: not reproducible; a floating version changes
  diagnostics.
- A globally installed compiler: not reproducible on contributors' machines.
- A transpiling build: violates the no-build runtime and changes test inputs.

`tsconfig.json` uses `allowJs`, `strict`, `noEmit`, `target ES2022`,
`module ESNext`, `moduleResolution Bundler`, DOM libraries, `skipLibCheck` and
`types: []`. The final stage sets `checkJs: true`; during rollout it stays
`false` and each targeted file opts in with `// @ts-check`. This is the key
staging mechanism: TypeScript follows imports but checks only opted-in files,
so untouched modules do not force `@ts-nocheck` or a red gate. The pragmas can
stay after the final flip. `noUncheckedIndexedAccess` stays off initially
because the domain uses keyed player records; it can be a later, separate
decision.

### 2. Central declarations, local JSDoc

`js/types.d.ts` holds cross-cutting contracts: `GameState`, `Player`,
`Script`, `Command`, `CommandResult`, `Event`, `Effect` and store result types.
Modules reference them through JSDoc `import("./types.js")` type imports; the
import is erased and never loaded at runtime. Module-private shapes stay as
local `@typedef` declarations next to the code.

Alternatives:

- Put every type in each module: circular `@typedef` imports become hard to
  follow.
- A single `types.js` runtime module: adds a runtime file for types only.

The `.d.ts` file is not a runtime asset. `scripts/build-offline.mjs` excludes
`.d.ts` from the precache, like test files.

### 3. Stage the checked set, never shrink it

`tsconfig.include` covers `js/**/*.js` and `js/types.test-d.ts` from the start.
Coverage grows by adding `// @ts-check` to a file; the final stage flips
`checkJs` to `true` and removes no file. Order follows the import graph so each
stage is green:

```
A model + rules + scripts + effect-graph
        |
        v
B effects + context + information
        |
        v
C setup + death + night + day + corrections
        |
        v
D bmr + sv
        |
        v
E commands + engine.js
        |
        v
F store
        |
        v
G UI batches
        |
        v
H checkJs: true over all runtime files
```

A stage records the failing diagnostic count (RED), annotates, then reaches
zero (GREEN). `commands.js` comes after the domain because it imports every
engine module; `store.js` follows because it imports `commands.js`. A later
stage must not remove a `// @ts-check` pragma or shrink the checked set.

### 4. Compile-time contract tests

`js/types.test-d.ts` is included in the gate and is never executed. It asserts:

- a valid `allowed` result assigns to the result union;
- reading a rejection-only field requires narrowing;
- an unknown command payload fails with `@ts-expect-error`;
- removing a required state field breaks the expected read.

This file is the type-level regression suite. Runtime behavior stays covered by
the existing 201 tests.

### 5. Suppression policy

- `@ts-ignore` and `@ts-nocheck` are forbidden.
- `@ts-expect-error` is allowed only with a reason on the same line.
- `any` is allowed only at an untyped browser boundary, with a comment; use
  `unknown` plus a guard where possible.

`scripts/check-types-policy.mjs` scans `js/**/*.js` and fails the type-check
job on a forbidden suppression or an unexplained `@ts-expect-error`. This is a
small deterministic script; it has its own `node:test` case.

### 6. CI placement

A new `typecheck` job in `.github/workflows/ci.yml` runs on pull requests:
checkout, Node 24, `npm ci`, `npm run typecheck`,
`node --test scripts/check-types-policy.test.mjs`, then the policy scan. It
has a 10-minute timeout. The Pages workflow keeps its current steps: a type
error already blocks merge, and deployment does not need a second npm install.

## Risks / Trade-offs

- **Strict mode exposes many pre-existing errors** → stage by module, start
  with the model, and keep each stage a small commit.
- **JSDoc casts can hide a real bug** → prefer `unknown` and guards; every
  suppression needs a reason; runtime tests stay the authority.
- **Types drift from the actual JSON** → type tests plus `store.test.mjs`,
  `scripts.test.mjs` and export/import fixtures.
- **A strict-null fix changes behavior** → isolate it in its own commit with a
  RED runtime test first; type-only edits must not touch logic.
- **`sw.js` churn from JSDoc bytes** → regenerate after each stage and verify
  the cache id and asset count; this is expected and harmless.
- **TypeScript version drift** → exact version in the lockfile; upgrade as a
  separate change.
- **Editors resolve `./types.js` to `.d.ts` differently** → `tsc` is the
  authority; verify in the first stage. If resolution fails, use a `types/`
  declaration folder referenced by relative path and keep it out of staging.
- **Policy script false positives** → keep the rule narrow: line-based
  `@ts-ignore`/`@ts-nocheck` and `@ts-expect-error` without a following reason.

## Migration Plan

1. Land tooling, the model stage and the CI gate together; CI stays green.
2. Add one stage per pull request or per commit on the change branch. Each
   stage runs the full runtime suite and browser checks.
3. Regenerate `sw.js` after each stage; verify the offline update flow.
4. After the final stage, remove any temporary `include` entries and confirm
   every runtime `js/**/*.js` file is checked.
5. Rollback: revert the stage commit. Type annotations are comments; no saved
   data, storage key or Pages configuration needs a rollback. Removing the CI
   job and `tsconfig.json` returns the project to the current state.

## Open Questions

None. The exact TypeScript 5.x patch version is resolved and locked during
implementation; it does not change the approach or the tasks.

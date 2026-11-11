# Proposal

Issue: #74

## Why

The repository gates types, tests and build output, but it has no linter and no
formatter. Style and dead code drift between the legacy `js/` screens and the
`src/` layers, and nothing stops a contributor from adding ESLint and Prettier,
two JavaScript toolchains this project does not want.

## What Changes

- Add `oxlint` and `oxfmt` as exact-pinned devDependencies and make them the
  only lint and format toolchain.
- Add `lint`, `format` and `format:check` scripts, and run lint and format check
  from `npm run verify`.
- Add `.oxlintrc.json` and `.oxfmtrc.json`.
- Add a blocking `Lint and format` job to the pull request CI workflow.
- Add `scripts/check-toolchain.mjs` with `node:test` coverage: it fails when
  ESLint or Prettier appears as a dependency, a config file, an ignore file or a
  script command.
- Add `.gitattributes` with `* text=auto eol=lf`, because `oxfmt` writes LF and
  this Windows checkout uses `core.autocrlf=true`; without it `format:check`
  fails locally on every file.
- Fix the lint findings the new gate reports and format the tracked JavaScript,
  TypeScript and root JSON once, in an isolated `style:` commit.
- Not breaking: no runtime dependency, no build output change, no test change,
  no storage change.

## Capabilities

### New Capabilities

- `app/lint-and-format`: the one lint and format toolchain, its file scope, the
  rejected legacy tools and the pull request gate.

### Modified Capabilities

None. `app/build-pipeline` names only the build scripts and never mentions
`verify`, so adding lint and format scripts changes no existing requirement.

## Impact

- New files: `.oxlintrc.json`, `.oxfmtrc.json`, `.gitattributes`,
  `scripts/check-toolchain.mjs`, `scripts/check-toolchain.test.mjs`.
- Changed: `package.json`, `package-lock.json`, `.github/workflows/ci.yml`,
  `AGENTS.md` "Development Commands", and every formatted source file.
- Tools: `oxlint@1.93.0` and `oxfmt@0.78.0`, dev only, exact versions.
- Measured baseline on `b863343`: formatter changes 10,005 added and 5,214
  removed lines across `js/`, `src/` and `scripts/` at the default settings;
  lint reports 76 `correctness` findings in 31 files, 73 of them
  `no-unused-vars`.

# app/lint-and-format Specification

## Purpose
Defines the one lint and format toolchain this project runs, the files it covers,
the tools it rejects, and the pull request gate that keeps the repository clean.

## Requirements

### Requirement: One lint and format toolchain

`package.json` SHALL declare `oxlint` and `oxfmt` at exact versions and SHALL
expose `lint`, `format` and `format:check` scripts that run them. These SHALL be
the only linter and the only formatter the project installs.

**Source**: [Issue #74](https://github.com/hose1021/grimoria/issues/74); `AGENTS.md` "Development Commands"
**Tests**: `scripts/check-toolchain.test.mjs`, `.github/workflows/ci.yml`

#### Scenario: Lint covers the tracked source

- **WHEN** a developer runs `npm run lint`
- **THEN** `oxlint` checks `js/`, `src/`, `scripts/` and `vite.config.ts` and
  exits non-zero on a diagnostic

#### Scenario: Format check names a dirty file

- **WHEN** a tracked file does not match the formatter output
- **THEN** `npm run format:check` exits non-zero and names that file, and
  `npm run format` rewrites it

#### Scenario: A second linter appears

- **WHEN** another linter or formatter is added to `devDependencies` or to a
  script command
- **THEN** `node scripts/check-toolchain.mjs` exits non-zero

### Requirement: Rejected legacy toolchains

The toolchain check SHALL fail when ESLint or Prettier appears as a dependency,
a configuration file, an ignore file or a script command.

**Source**: [Issue #74](https://github.com/hose1021/grimoria/issues/74) "Do not use ESLint and Prettier"
**Tests**: `scripts/check-toolchain.test.mjs`

#### Scenario: Legacy dependency

- **WHEN** `prettier` or `eslint` is listed in `dependencies` or in
  `devDependencies`
- **THEN** the check names the offending package and exits non-zero

#### Scenario: Legacy configuration or ignore file

- **WHEN** `.prettierrc`, `prettier.config.*`, `.eslintrc*`, `eslint.config.*`,
  `.eslintignore` or `.prettierignore` exists in the repository root
- **THEN** the check names the offending path and exits non-zero

#### Scenario: Clean tree

- **WHEN** only `oxlint` and `oxfmt` are installed and configured
- **THEN** the check exits zero

### Requirement: Declared formatting scope

The format scripts SHALL cover the tracked JavaScript, TypeScript and JSON files
under `js/`, `src/` and `scripts/` and the root configuration files. They SHALL
NOT rewrite `package-lock.json`, `dist/`, `node_modules/`, `public/assets/`,
`docs/official/` or any Markdown file.

**Source**: [Issue #74](https://github.com/hose1021/grimoria/issues/74); `AGENTS.md` "Important Files"
**Tests**: `scripts/check-toolchain.test.mjs`, `.github/workflows/ci.yml`

#### Scenario: Reference data stays byte-identical

- **WHEN** `npm run format` runs
- **THEN** `docs/official/roles.json`, `docs/official/nightsheet.json`, the
  locale catalogs under `public/assets/data/` and every Markdown file are
  unchanged

#### Scenario: Lockfile untouched

- **WHEN** `npm run format` runs after `npm install`
- **THEN** `package-lock.json` is unchanged

### Requirement: Pull request gate

Pull request CI SHALL run `lint` and `format:check` and SHALL fail that job on any
diagnostic or unformatted file. `npm run verify` SHALL run both commands before
the build steps.

**Source**: [Issue #74](https://github.com/hose1021/grimoria/issues/74); `AGENTS.md` "Development Commands"
**Tests**: `.github/workflows/ci.yml`, `scripts/check-toolchain.test.mjs`

#### Scenario: Lint diagnostic

- **WHEN** a pull request adds an unused import
- **THEN** the `Lint and format` job fails and the pull request cannot merge

#### Scenario: Unformatted file

- **WHEN** a pull request commits a file that `npm run format` would rewrite
- **THEN** the same job fails

#### Scenario: One local entry point

- **WHEN** a developer runs `npm run verify`
- **THEN** the type check, `lint`, `format:check`, the tests, the build, the
  fallback, the offline worker and the policy scripts all run in that order

### Requirement: Line endings agree across platforms

The repository SHALL declare LF line endings for text files in `.gitattributes`,
so `format:check` reports the same result on a Windows checkout with
`core.autocrlf=true` and on the Linux CI runner.

**Source**: [Issue #74](https://github.com/hose1021/grimoria/issues/74); measured `core.autocrlf=true` in this checkout
**Tests**: `.github/workflows/ci.yml`

#### Scenario: Fresh Windows checkout

- **WHEN** a Windows developer clones the repository and runs
  `npm run format:check` without editing a file
- **THEN** the command exits zero

#### Scenario: Tracked source uses LF

- **WHEN** `git ls-files --eol js/app.js` runs
- **THEN** it reports `i/lf` and `w/lf`

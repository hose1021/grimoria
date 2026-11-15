# Spec Delta

## Purpose

Defines the portable verification contract: the same checks run on Windows and
POSIX, browser checks own their build artifact, and a failure reports the state
it observed instead of hiding it behind a longer wait.

## ADDED Requirements

### Requirement: Portable structural scanner paths

The structural scanner SHALL report repository-relative paths with `/` on every
platform and SHALL keep rejecting the same forbidden imports. The platform path
separator SHALL NOT decide whether an import is excluded.

**Source**: [Issue #184](https://github.com/hose1021/grimoria/issues/184);
`AGENTS.md` "Commands"
**Tests**: `src/ui/screens/structure.test.ts` "repository-relative paths use forward slashes"; `src/ui/screens/structure.test.ts` "the boot modules do not import the engine"

#### Scenario: Windows separators

- **WHEN** the scanner reports `src\entry\screens\demo.ts` on Windows
- **THEN** it compares the portable form `src/entry/screens/demo.ts` with the boot exclusions

#### Scenario: Forbidden import remains detected

- **WHEN** a boot module outside the allowed screens directory imports `core/engine`
- **THEN** the boot test fails and names the file and the specifier

### Requirement: File-URL loading in the acceptance check

`scripts/check-acceptance.mjs` SHALL load local TypeScript modules through a
`file://` URL built with `pathToFileURL`, so a Windows drive letter is never
parsed as a URL scheme. The matrix, support-model and README checks SHALL remain
in force.

**Source**: [Issue #184](https://github.com/hose1021/grimoria/issues/184)
**Tests**: `scripts/check-acceptance.mjs`; `package.json` "verify"

#### Scenario: Windows drive path

- **WHEN** the repository root is `F:\Programming\grimoria\grimoria`
- **THEN** the support and rules modules load and the check reports the role and test-file counts

#### Scenario: Mismatched support model

- **WHEN** the support model disagrees with a verified matrix row
- **THEN** the check exits non-zero and names the role

### Requirement: Private browser-check artifact

`scripts/browser-check.mjs` SHALL build and serve its bundles from a unique
temporary directory per run, SHALL NOT depend on or mutate the checkout's
`dist/` unless `PG_SKIP_BUILD` is set, and SHALL remove the directory when the
process exits.

**Source**: [Issue #184](https://github.com/hose1021/grimoria/issues/184)
**Tests**: `scripts/browser-check.mjs`; `.github/workflows/ci.yml` "Playwright regression checks"

#### Scenario: Concurrent build

- **WHEN** another build rewrites the checkout's `dist/` while the browser check runs
- **THEN** the served artifact, its assets and the service worker still come from the private directory

#### Scenario: Fast update

- **WHEN** the suite runs the opening-check update, the later deploy and the explicit-update flow
- **THEN** the page settles on the expected worker and cache, and the saved game survives

#### Scenario: Clean exit

- **WHEN** the suite passes or an assertion fails
- **THEN** the temporary artifact directory is removed on process exit

### Requirement: Settle failure diagnostics

When the update check does not settle, `browser-check.mjs` SHALL report the last
worker version, the last load count, whether a worker is waiting, the controller
state and the cache keys. It SHALL NOT increase the settling timeout to conceal
the failure.

**Source**: [Issue #184](https://github.com/hose1021/grimoria/issues/184)
**Tests**: `scripts/browser-check.mjs` "the page never settled"

#### Scenario: Worker never settles

- **WHEN** the page keeps running an unexpected worker for the full settling window
- **THEN** the error names the expected cache and the observed worker, load and cache state

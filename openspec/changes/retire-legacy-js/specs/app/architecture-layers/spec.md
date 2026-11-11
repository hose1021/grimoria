# Spec Delta

## MODIFIED Requirements

### Requirement: Layer ownership and allowed imports

The application SHALL be split into `src/core`, `src/application`,
`src/infrastructure` and `src/ui`, and the import direction SHALL be:
`core` imports only `core`, `src/data` and the type-only core ports;
`application` imports `core` and itself; `infrastructure` imports `application`
and `core`; `ui` imports `application` and `core` read-model types; the
composition root imports all four. Every runtime module SHALL live in one of
these layers or in the composition root.

**Source**: `AGENTS.md` "Architecture & Data Flow"; issue #59, issue #132
**Tests**: `scripts/check-types-policy.test.mjs`, `src/core/model/types.test-d.ts`

#### Scenario: Core stays pure

- **WHEN** a `src/core` module imports an `application`, `infrastructure` or
  `ui` module
- **THEN** the architecture check fails and names the file and the specifier

#### Scenario: Ports live in the right layer

- **WHEN** `core` needs a clock or an id source
- **THEN** it imports the core port type, and a `core` import of
  `src/application/ports` fails the check

#### Scenario: Application avoids the browser

- **WHEN** a `src/application` module imports a concrete storage adapter or the
  `ui` layer
- **THEN** the architecture check fails

#### Scenario: One composition root

- **WHEN** a module outside the entry point constructs an infrastructure
  implementation
- **THEN** the architecture check fails


### Requirement: Domain ownership and legacy isolation

The game rules, the state model, the script catalog and the effect graph SHALL
live in `core`. The JavaScript tree `js/` SHALL NOT exist; every runtime
module SHALL live in a layer, and no import specifier, build configuration,
lint scope, type program or script SHALL name the retired tree as a live path.

**Source**: `AGENTS.md` "Architecture & Data Flow"; issue #59, issue #132
**Tests**: `scripts/check-types-policy.test.mjs`,
`src/core/model/presets.test.ts`

#### Scenario: The legacy tree is not a dependency

- **WHEN** any file under `src` or `scripts` imports a path under `js/`,
  including an `import type`
- **THEN** the architecture check fails and names the file and the specifier

#### Scenario: Retired tree is absent

- **WHEN** the repository is checked after the migration
- **THEN** `js/` does not exist and no configuration or script lists a `js/`
  glob

#### Scenario: Shims re-export the whole surface

- **WHEN** the shims are deleted
- **THEN** the browser test entry and the moved tests import their modules
  directly, and the suite fails at import time if a public name is lost

#### Scenario: Tests follow their modules

- **WHEN** a runtime module moves into a layer
- **THEN** its asserting test moves beside it and is still run by `npm test`


### Requirement: Production and test source sets

The project SHALL define a production set and a disjoint test set under `src/`.
Production configurations SHALL exclude `*.test.ts`, `*.test-d.ts` and test
fixtures and SHALL keep `types: []`; the test configuration SHALL include those
files with Node types. Test files SHALL NOT be reachable from production code,
and no test SHALL live outside `src/`.

**Source**: `AGENTS.md` "Development Commands"; issue #52, issue #132
**Tests**: `scripts/check-types-policy.test.mjs`, `src/core/model/types.test-d.ts`

#### Scenario: Node types stay in tests

- **WHEN** a production `src` file imports `node:test`
- **THEN** the architecture check fails and the production type-check fails
  because Node types are not enabled there

#### Scenario: Tests type-check

- **WHEN** `npm run typecheck` runs
- **THEN** the test configuration also runs, and a type error in a `*.test.ts`
  file fails the command

#### Scenario: Test code does not leak

- **WHEN** a non-test module imports a `*.test.ts`, `*.test-d.ts` or fixture
  path
- **THEN** the architecture check fails

#### Scenario: Core tests stay browser-free

- **WHEN** a test beside a `core` module imports `infrastructure`
- **THEN** the check fails, so the pure suite keeps running without adapters

#### Scenario: No test tree outside src

- **WHEN** the test glob and the test type program are read
- **THEN** both include `src/**` only, because the legacy test directory is
  deleted


### Requirement: Automated boundary check

A repository check SHALL parse every static import and export form in `src`,
classify the specifier, and reject a forbidden edge or a reference to the
retired `js/` tree. It SHALL be exercised by negative fixtures that prove each
rule can fail, and it SHALL document which bypasses a textual scan cannot
detect.

**Source**: `AGENTS.md` "Development Commands"; issue #52, issue #132
**Tests**: `scripts/check-types-policy.test.mjs`

#### Scenario: Covered specifier forms

- **WHEN** a file uses an import, a side-effect import, `export … from`,
  `export * from`, `import type` or a literal dynamic `import()`
- **THEN** the specifier is extracted and classified

#### Scenario: Non-literal dynamic import

- **WHEN** `core` or `application` calls `import()` with a non-literal argument
- **THEN** the check fails, because the dependency cannot be resolved
  statically

#### Scenario: Fixture per rule

- **WHEN** the check runs against a fixture with a forbidden edge or a forbidden
  token
- **THEN** it exits non-zero and the test asserts the message

#### Scenario: Clean tree

- **WHEN** no module crosses a boundary
- **THEN** the check exits zero and the pipeline continues

#### Scenario: Stated limit

- **WHEN** the check's documentation is read
- **THEN** it names the bypasses it cannot prove absent (a cast through a
  helper, a runtime-assembled specifier in `ui`, `Object.assign`) and says that
  review is the second control

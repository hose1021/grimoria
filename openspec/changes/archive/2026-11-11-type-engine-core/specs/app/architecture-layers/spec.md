# Spec Delta

## Purpose

Moves the domain into `core`: the rules, the state model, the script catalog and
the effect graph leave `js/`, and no `src` module may import the legacy tree.

## MODIFIED Requirements

### Requirement: Layer ownership and allowed imports

The application SHALL be split into `src/core`, `src/application`,
`src/infrastructure` and `src/ui`, and the import direction SHALL be:
`core` imports only `core`, `src/data` and the type-only core ports;
`application` imports `core` and itself; `infrastructure` imports `application`
and `core`; `ui` imports `application` and `core` read-model types; the
composition root imports all four. The game rules, the state model, the script
catalog and the effect graph SHALL live in `core`. No `src` module SHALL import
`js/`, neither a value nor a type; `js/` SHALL keep no domain module, only the
re-export shims that the legacy screens still import.

**Source**: `AGENTS.md` "Architecture & Data Flow"; issue #59
**Tests**: `scripts/check-types-policy.test.mjs`, `js/types.test-d.ts`

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

#### Scenario: The legacy tree is not a dependency

- **WHEN** any file under `src` imports a module under `js/`, including an
  `import type`
- **THEN** the architecture check fails and names the file

#### Scenario: Shims re-export the whole surface

- **WHEN** a shim loses an export that a screen or a test imports
- **THEN** importing it fails in `js/test-entry.js` and the `.mjs` suite fails

# Spec Delta

## Purpose

Makes the engine state the only source of the facts the console and the setup
screens render: the screens read an application read model instead of calling
the engine, and a structural test fails when a screen imports the engine or the
legacy `js/` tree.

## ADDED Requirements

### Requirement: Screens render one projection

The derived console facts — the current step, its progress, the pending demon
change, the living count and threshold, the target bounds, information, effects
and Mayor redirect, the seat facts, and the setup and secrets errors — SHALL be
computed once by the engine and the read models in
`src/application/read-models/`. A screen SHALL render them and SHALL NOT call an
engine function or import the engine or `js/`.

**Source**: issue #33, parent #19 Stage 1; `AGENTS.md` "Architecture & Data Flow"
**Tests**: `src/application/read-models/table.test.ts`, `src/ui/screens/structure.test.ts`

#### Scenario: Projection after every command

- **WHEN** the scenario applies the setup, first night, day and second-night
  commands, including an Imp attack on the Mayor
- **THEN** after every command the table, step and seat projections equal the
  engine's current step, progress, pending demon change, execution threshold,
  information, effects and seat facts

#### Scenario: Registrations reach the answer

- **WHEN** the host registers the Recluse as evil for the Chef
- **THEN** the step projection hands the same Chef count as the engine and the
  count differs from the unregistered answer

#### Scenario: Screen import boundary

- **WHEN** a module under `src/ui/screens` imports `src/core/engine` or `js/`
- **THEN** the structure test fails and names the file and the specifier

#### Scenario: No behavior change

- **WHEN** the screens render from the projection
- **THEN** the values, the dispatch commands and the persisted state are
  unchanged from the direct engine calls

### Requirement: Preview at the dispatch boundary

The command preview SHALL be built by `src/application/dispatch/preview.ts`,
which adds the fresh command id and the ruleset version. The composition root
SHALL NOT import the engine to build it.

**Source**: `AGENTS.md` "Architecture & Data Flow"; issue #33
**Tests**: `src/application/read-models/table.test.ts`, `src/ui/screens/structure.test.ts`

#### Scenario: Composition root stays rule-free

- **WHEN** `src/entry` imports the engine to build a preview command
- **THEN** the structure test fails; the preview is built at the dispatch
  boundary instead

#### Scenario: Preview keeps apply's timestamp

- **WHEN** the screen previews a command
- **THEN** the fresh id pins the timestamp that apply reuses for the same
  initial state

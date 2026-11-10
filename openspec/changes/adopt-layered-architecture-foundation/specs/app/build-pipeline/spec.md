# Spec Delta

## Purpose

Defines how the application is built and published: one build command, one
artifact, a base path that works at the root, under a project subpath and on a
custom domain, a real 404 fallback for nested routes, and an offline asset list
derived from the artifact rather than from the source tree.

## ADDED Requirements

### Requirement: Build artifact and scripts

The project SHALL expose `dev`, `build`, `preview` and `typecheck` as separate
scripts. `build` SHALL emit a self-contained static artifact in `dist/` that
loads no script, stylesheet, font or image from a CDN, and every build
dependency SHALL be recorded in the committed lockfile.

**Source**: `AGENTS.md` "Development Commands"; `SPEC.md` "Pages"; issue #52
**Tests**: `scripts/browser-check.mjs`, `js/offline-worker.test.mjs`

#### Scenario: Artifact contents

- **WHEN** `build` completes
- **THEN** `dist/` contains `index.html`, the fingerprinted JavaScript and CSS,
  the role images, the fonts, the three catalogs and `404.html`, and the app
  loads every one of them from the same origin

#### Scenario: Type check and build both gate

- **WHEN** a pull request changes source with a type error
- **THEN** `typecheck` fails and the pull request cannot merge, while `build`
  alone is not accepted as evidence that the source is correct

### Requirement: Base path independence

The build SHALL take its application base from configuration and the same
source SHALL serve correctly at `/`, at a project subpath and at a custom
domain. Runtime code SHALL NOT derive the application root from the location of
a built module.

**Source**: `SPEC.md` "Pages"; `AGENTS.md` "Development Commands"
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Project subpath

- **WHEN** the artifact is served from `/pocket-grimoire-go/` and the browser
  opens `/pocket-grimoire-go/table`
- **THEN** every asset resolves under that prefix and the route renders

#### Scenario: Nested entry chunk

- **WHEN** the entry chunk is emitted in a subdirectory of `dist/`
- **THEN** the routes still resolve from the configured base and not from the
  chunk's directory

### Requirement: Nested route reload on the static host

The deployment SHALL consist of the built artifact only. A request for a nested
route with no matching file SHALL receive the 404 document with status 404, and
that document SHALL restore the requested route. Verification SHALL use a
server that reproduces this behaviour; a dev-server fallback answering 200
SHALL NOT count as evidence.

**Source**: `SPEC.md` "Runtime" and "Pages"; `AGENTS.md` "Testing & QA"
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Route reload under the root

- **WHEN** the browser reloads `/table` and `/sheet/ru` at the root base
- **THEN** each request receives status 404, the fallback restores the route and
  the screen renders

#### Scenario: Route reload under the subpath

- **WHEN** the browser reloads the same routes under `/pocket-grimoire-go/`
- **THEN** the fallback keeps the subpath and the route is restored

#### Scenario: Unknown route

- **WHEN** the browser opens a path the router does not know
- **THEN** the app renders `/table`

### Requirement: Offline asset list from the artifact

The service worker SHALL be generated after the build from the emitted
artifact, SHALL include every JavaScript and CSS chunk, every lazy chunk, every
catalog, font and image, and the app shell, and SHALL NOT include itself in the
hashed asset list.

**Source**: `SPEC.md` "Reliability and live-play additions"; issue #52
**Tests**: `js/offline-worker.test.mjs`

#### Scenario: Emitted chunks are precached

- **WHEN** the worker is generated from a build that produced several chunks
- **THEN** every emitted chunk appears in the precache list

#### Scenario: A changed file changes the cache id

- **WHEN** one built file changes and the worker is regenerated
- **THEN** the cache name changes and the previous `pg-static-` cache is pruned
  on activation

#### Scenario: The worker does not hash itself

- **WHEN** the asset list is generated
- **THEN** `sw.js` is absent from the list, so regenerating it does not change
  the cache id by itself

### Requirement: Deployment separation

Deployment SHALL run only from `main` after the owner merges and SHALL publish
the built artifact. Pull request validation SHALL build and test without
publishing.

**Source**: `AGENTS.md` "Merge Policy" and "Branching Strategy"; `SPEC.md` "Pages"
**Tests**: `.github/workflows/pages.yml`

#### Scenario: Pull request

- **WHEN** a pull request runs the pipeline
- **THEN** type check, tests, build and offline generation run and no
  deployment job executes

#### Scenario: Merge to main

- **WHEN** the owner merges the pull request
- **THEN** the same checks run and the built artifact is deployed

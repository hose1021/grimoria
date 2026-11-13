# app/build-pipeline Specification

## Purpose
Defines how the application is built and published: one build command, one
artifact, a base path that works at the root, under a project subpath and on a
custom domain, a fallback document that restores a nested route without a
redirect loop, and an offline asset list derived from the artifact rather than
from the source tree.

## Requirements

### Requirement: Build artifact and scripts

The project SHALL expose `dev`, `build`, `preview`, `fallback`, `offline` and
`typecheck` as separate scripts. `build` SHALL emit a self-contained static
artifact in `dist/` that loads no script, stylesheet, font or image from a CDN,
and every build dependency SHALL be recorded in the committed lockfile.

**Source**: `AGENTS.md` "Development Commands"; `SPEC.md` "Pages"; issue #52
**Tests**: `scripts/browser-check.mjs`, `src/infrastructure/offline/offline-worker.test.ts`

#### Scenario: Artifact contents

- **WHEN** `build`, `fallback` and `offline` complete
- **THEN** `dist/` contains `index.html`, the fingerprinted JavaScript and CSS,
  the role images, the fonts, the three catalogs, the generated `404.html` and
  the generated `sw.js`, and the app loads every one of them from the same
  origin

#### Scenario: Type check and build both gate

- **WHEN** a pull request changes source with a type error
- **THEN** `typecheck` fails and the pull request cannot merge, while `build`
  alone is not accepted as evidence that the source is correct

### Requirement: One normalized base path

The build SHALL take its application base from configuration, normalize it to
one leading and one trailing slash, and use that one value for the build, the
router root, the fallback document and every computed asset URL. Runtime code
SHALL NOT derive the application root from the location of a built module or
from the current document.

**Source**: `SPEC.md` "Pages"; `AGENTS.md` "Development Commands"
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Accepted inputs

- **WHEN** the configured base is `""`, `"/"`, `"pocket-grimoire-go"` or
  `"/pocket-grimoire-go/"`
- **THEN** it normalizes to `"/"` for the first two and `"/pocket-grimoire-go/"`
  for the others

#### Scenario: Project subpath

- **WHEN** the artifact is served from `/pocket-grimoire-go/` and the browser
  opens `/pocket-grimoire-go/table`
- **THEN** every asset resolves under that prefix and no request falls back to
  `/assets/…` at the root

#### Scenario: Nested entry chunk

- **WHEN** the entry chunk is emitted in a subdirectory of `dist/`
- **THEN** the routes still resolve from the configured base and not from the
  chunk's directory

### Requirement: Nested route reload on the static host

The deployment SHALL consist of the built artifact only. An unknown nested path
SHALL receive the generated fallback document with status 404, and that
document SHALL redirect to the configured application base — never to a parent
of the current URL — after storing the requested path and query only when they
belong to the application base. The route SHALL be restored from that stored
value without a redirect loop.

**Source**: `SPEC.md` "Runtime" and "Pages"; `AGENTS.md` "Testing & QA"
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Cold open of a nested route

- **WHEN** a fresh browser context with no service worker opens `/table` or
  `/sheet/{ru,en,az}` at the root or under the project subpath
- **THEN** the first response is the fallback with status 404, the document
  redirects to the base, and the requested route renders

#### Scenario: Trailing slash

- **WHEN** the browser opens `/table/` or `/sheet/ru/`
- **THEN** the route resolves to the same screen as without the trailing slash

#### Scenario: Query string

- **WHEN** the browser opens `/table?x=1`
- **THEN** the query survives the fallback and the restored URL keeps it

#### Scenario: Unknown route

- **WHEN** the browser opens a path inside the base that the router does not know
- **THEN** the app renders `/table`

#### Scenario: Path outside the base

- **WHEN** the fallback is served for a path that does not start with the
  application base
- **THEN** nothing is stored and the visitor is not redirected to another
  application

#### Scenario: No redirect loop

- **WHEN** any of the cases above is opened
- **THEN** the navigation produces at most one 404 response

#### Scenario: Fallback served for the base itself

- **WHEN** the host answers the base path with the fallback document
- **THEN** the document does not redirect, because another redirect would loop

### Requirement: Offline asset list from the artifact

The service worker SHALL be generated after the build from the emitted
artifact, SHALL include every JavaScript and CSS chunk, every lazy chunk, every
font and image, every locale catalog the catalog loader can request, and the app
shell, and SHALL NOT include itself or any other locale catalog in the hashed
asset list. The generator SHALL require an explicit root and an explicit output
path.

**Source**: `SPEC.md` "Reliability and live-play additions"; issue #52
**Tests**: `src/infrastructure/offline/offline-worker.test.ts`

#### Scenario: Emitted chunks are precached

- **WHEN** the worker is generated from a build that produced several chunks
- **THEN** every emitted chunk appears in the precache list

#### Scenario: A catalog the loader can request is precached

- **WHEN** the artifact contains the catalogs the locale loader maps
- **THEN** each of those catalogs appears in the precache list

#### Scenario: An unreachable catalog is not precached

- **WHEN** the artifact contains a locale catalog the loader can never request
- **THEN** that catalog is absent from the precache list and from the cache id
  hash input

#### Scenario: A changed file changes the cache id

- **WHEN** one built file changes and the worker is regenerated
- **THEN** the cache name changes and the previous `pg-static-` cache is pruned
  on activation

#### Scenario: The worker does not hash itself

- **WHEN** the asset list is generated
- **THEN** `sw.js` is absent from the list, so regenerating it does not change
  the cache id by itself

#### Scenario: Missing arguments

- **WHEN** the generator is invoked without a root or without an output path
- **THEN** it exits non-zero instead of reading the source tree

### Requirement: Deployment separation

Deployment SHALL run only from `main` after the owner merges and SHALL publish
the built artifact. Pull request validation SHALL build and test without
publishing.

**Source**: `AGENTS.md` "Merge Policy" and "Branching Strategy"; `SPEC.md` "Pages"
**Tests**: `.github/workflows/pages.yml`

#### Scenario: Pull request

- **WHEN** a pull request runs the pipeline
- **THEN** type check, tests, build, fallback generation and offline generation
  run and no deployment job executes

#### Scenario: Merge to main

- **WHEN** the owner merges the pull request
- **THEN** the same checks run and the built artifact is deployed

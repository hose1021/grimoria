## MODIFIED Requirements

### Requirement: Offline asset list from the artifact

The service worker SHALL be generated after the build from the emitted
artifact. It SHALL include the shell, emitted chunks (including lazy chunks),
fonts referenced by built CSS, role images selected by supported catalogs,
other runtime images and each locale catalog the loader can request. The
hashed asset list SHALL exclude the worker itself and unreachable catalogs. The generator SHALL require an explicit root and an explicit output
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

- **WHEN** a precached file changes and the worker is regenerated
- **THEN** the cache name changes and the previous `pg-static-` cache is pruned
  on activation

#### Scenario: The worker does not hash itself

- **WHEN** the asset list is generated
- **THEN** `sw.js` is absent from the list, so regenerating it does not change
  the cache id by itself

#### Scenario: Missing arguments

- **WHEN** the generator is invoked without a root or without an output path
- **THEN** it exits non-zero instead of reading the source tree

#### Scenario: Unused font and role art

- **WHEN** an alternative role image is never selected and a font is unused by the built stylesheets
- **THEN** neither file contributes to the precache list or its version

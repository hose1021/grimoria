## ADDED Requirements

### Requirement: Release metadata is exempt only when the diff proves it

A pull request SHALL declare risk R0 for release metadata only when the commit
range changes solely `VERSION`, the `package.json` version field, the
corresponding `package-lock.json` version fields, `CHANGELOG.md` and
`RELEASE_STATE.md`, and the semantic checks pass. The pull request title and the
changed-file list alone SHALL NOT grant the exemption. A dependency, script,
runtime, workflow or verification-policy change SHALL fail the exemption and
keep the R3 requirement.

**Source**: Issue #519
**Tests**: `scripts/release-metadata.test.ts`, `scripts/check-risk-tier.test.ts`

#### Scenario: Valid version bump

- **WHEN** the range changes the version in `VERSION`, `package.json` and
  `package-lock.json`, adds the dated changelog heading and names the version in
  `RELEASE_STATE.md`
- **THEN** the range is release metadata only and the risk check accepts R0

#### Scenario: Dependency or script change

- **WHEN** an allowed file also changes a dependency, a script or any other
  package field
- **THEN** the exemption fails and the diff keeps the R3 requirement

#### Scenario: Runtime, workflow or policy change

- **WHEN** the range touches a runtime file, a workflow file, a verification
  script or an OpenSpec policy spec
- **THEN** the exemption fails and names the path as not release metadata

#### Scenario: Version mismatch

- **WHEN** `VERSION`, `package.json` or the lock root package disagree, or the
  changelog has no dated heading for the new version
- **THEN** the exemption fails with the reason

#### Scenario: Names alone

- **WHEN** the changed-file list contains only release metadata paths but the
  semantic proof is absent
- **THEN** the package tier remains and a declared R0 fails as a downgrade

### Requirement: A multi-archive squash keeps reviewed origins

A squash merge that rewrites the first add of several archived changes SHALL
require a reviewed origin record for every entry. The integrated archive check
without a target ref SHALL pass only when all records exist, and the immutable
anchor SHALL NOT gain records for the newly integrated archives.

**Source**: Issue #519
**Tests**: `scripts/archive-index.test.ts`

#### Scenario: Batch squash without records

- **WHEN** one squash merge adds several archives whose feature commits are no
  longer reachable and no origin records exist
- **THEN** the integrated check fails for every archive

#### Scenario: Batch squash with records

- **WHEN** each archive has its reviewed origin record and the anchor still
  holds only the archives the target accepted
- **THEN** the integrated check and the target check pass

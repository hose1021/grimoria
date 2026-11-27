## ADDED Requirements

### Requirement: Risk-dependent evidence artifacts

A pull request that declares risk R3 SHALL name an OpenSpec change whose
proposal carries the same issue, and that change SHALL contain a proposal,
design, tasks and at least one delta spec. A verification-policy migration MAY
declare `Policy migration: true` and, when it does, SHALL pass with the three
documents and no gameplay delta spec. A change for another issue SHALL fail the
gate.

**Source**: Issue #519
**Tests**: `scripts/check-risk-artifacts.test.ts`, `.github/workflows/openspec.yml`

#### Scenario: Same-issue package

- **WHEN** an R3 body names a change whose proposal carries the body's issue and
  the change holds proposal, design, tasks and a delta spec
- **THEN** the artifact gate accepts the pull request

#### Scenario: Unrelated change

- **WHEN** the named change belongs to another issue
- **THEN** the artifact gate fails and names the mismatch

#### Scenario: Policy migration

- **WHEN** a verification-policy migration sets `Policy migration: true`
- **THEN** the gate accepts proposal, design and tasks without gameplay specs

### Requirement: Archive evidence is append-only against the target branch

The archive index SHALL keep every tree accepted on the target branch with its
recorded hash. A change to the archive, the index or the current baseline SHALL
NOT remove or rewrite such a tree, and the original anchor SHALL remain
satisfied.

**Source**: Issue #519
**Tests**: `scripts/archive-index.test.ts`

#### Scenario: Coordinated deletion

- **WHEN** the archive directory, the index and the current baseline are all
  rewritten without a tree accepted on the target branch
- **THEN** the archive gate fails and names the missing tree

#### Scenario: Rewritten tree

- **WHEN** the bytes of an accepted tree change
- **THEN** the archive gate fails with the new hash mismatch

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

### Requirement: Each risk tier keeps its evidence obligation

A change SHALL satisfy the evidence of every tier present in its diff, not only
the highest tier. A gameplay path in an R3 diff SHALL still carry its pinned
official source, rule identifier, asserting test and RED/GREEN record.

**Source**: Issue #519
**Tests**: `scripts/check-risk-tier.test.ts`

#### Scenario: Mixed diff

- **WHEN** a diff contains a gameplay path and a verification-policy path
- **THEN** the gate requires both the R2 and the R3 evidence

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

#### Scenario: Anchor growth

- **WHEN** a record is added to the original anchor that the target branch does
  not hold
- **THEN** the archive gate fails instead of exempting the new archive

#### Scenario: Deleted baseline record

- **WHEN** a baseline record is deleted and the index is rebuilt
- **THEN** the build refuses to re-pin the tree without a reviewed correction

### Requirement: Archive provenance survives squash integration

A recorded origin SHALL equal the first add of the change path. When a squash
removed that commit, a reviewed record in
`fixtures/conformance/archive-origins.json` SHALL name the origin; a record the
target branch accepted SHALL take precedence, and an origin written in the same
commit as the archive SHALL fail.

**Source**: Issue #519
**Tests**: `scripts/archive-index.test.ts`

#### Scenario: Squash release

- **WHEN** a feature archive is squashed into the integration branch, released
  and back-merged, and the target holds no record for it
- **THEN** the gate accepts the origin only through its reviewed record

#### Scenario: Same-commit origin

- **WHEN** a new archive and an index entry with an older origin are introduced
  in one commit
- **THEN** the gate fails because no record supports the origin

#### Scenario: Accepted record wins

- **WHEN** the target branch already holds a record whose origin differs
- **THEN** the gate fails and names the archive

### Requirement: Archived test references resolve

The archive gate SHALL reject an indexed test reference that resolves to no
regular repository file unless a reviewed correction maps it to an existing
asserting test. A runnable test SHALL be in the test manifest, a symbolic link or
a directory SHALL fail, and the index test list SHALL equal the references in the
archived delta specs.

**Source**: Issue #519
**Tests**: `scripts/archive-index.test.ts`

#### Scenario: Dangling reference

- **WHEN** an archived delta spec names a test file that does not exist
- **THEN** the gate fails unless a correction names an existing asserting file

#### Scenario: Symbolic link

- **WHEN** an archived tree contains a symbolic link
- **THEN** the gate fails instead of hashing the link target

### Requirement: An archive outside the anchor is complete and applied

An archive outside the accepted anchor SHALL have no open checklist item and
non-empty RED/GREEN evidence. Every ADDED or MODIFIED requirement SHALL be
present in the baseline, and a REMOVED requirement SHALL be gone. A completed
checklist alone SHALL NOT permit archiving an unsynchronized change.

**Source**: Issue #519
**Tests**: `scripts/archive-index.test.ts`

#### Scenario: Unfinished archive

- **WHEN** a new archive holds an open checklist item or an empty RED or GREEN
  line
- **THEN** the gate fails and names the archive

#### Scenario: Unapplied delta

- **WHEN** a newly archived change adds a requirement the baseline does not hold,
  or keeps a requirement it removed
- **THEN** the gate fails and names the requirement

### Requirement: Historical test paths resolve through one reviewed mapping

A historical `.mjs` or type-test path SHALL resolve through
`fixtures/conformance/legacy-test-paths.json`; a delta spec that names no test
SHALL fall back to the change's task and design evidence. Every referenced
historical path SHALL be mapped, every mapping SHALL be used and point at a
regular file, and no archived change SHALL carry an empty test list.

**Source**: Issue #519
**Tests**: `scripts/archive-index.test.ts`

#### Scenario: Historical reference

- **WHEN** an archived spec names a `.mjs` test file that the TypeScript
  migration replaced
- **THEN** the index records the mapped current file

#### Scenario: Unmapped reference

- **WHEN** a historical path has no reviewed mapping
- **THEN** the gate fails and names the path

### Requirement: Citation corrections use the complete identity

A citation correction SHALL match a citation by rule identifier, file and test
name. Several corrections for one rule SHALL all apply, and a correction whose
target is absent from the registry SHALL fail.

**Source**: Issue #519
**Tests**: `scripts/rule-registry.test.ts`

#### Scenario: Two corrected citations

- **WHEN** two citations of one rule are corrected and both targets exist
- **THEN** the parity check passes with both corrections

#### Scenario: Missing target

- **WHEN** a correction names a target the registry does not hold
- **THEN** the check fails and names the rule

### Requirement: An accepted verification level cannot drop

The registry check against the target branch SHALL fail when a rule's level falls
below the level the target accepted, and when an accepted rule disappears. A
raise SHALL pass.

**Source**: Issue #519
**Tests**: `scripts/rule-registry.test.ts`

#### Scenario: Downgrade

- **WHEN** a rule the target holds as `verified` becomes `host-choice`
- **THEN** the check fails and names the rule

#### Scenario: Raise

- **WHEN** a rule the target holds as `host-choice` becomes `verified`
- **THEN** the check passes

#### Scenario: Unknown level

- **WHEN** the target matrix carries a level outside the supported vocabulary
- **THEN** the check fails closed instead of dropping the row

### Requirement: Cited evidence resolves

A pull request's evidence SHALL name a test file that exists and, for R2, a file
the registry lists as asserting the named rule. An archived change SHALL resolve
by its exact name or date prefix, and a citation name the matrix cannot
represent SHALL fail instead of producing an unreadable row.

**Source**: Issue #519
**Tests**: `scripts/check-risk-tier.test.ts`, `scripts/check-risk-artifacts.test.ts`, `scripts/rule-registry.test.ts`

#### Scenario: Missing evidence file

- **WHEN** the body cites a test file that does not exist
- **THEN** the risk check fails and names the file

#### Scenario: Ambiguous archive name

- **WHEN** a base name matches no archive or more than one archive
- **THEN** the artifact check fails

### Requirement: Pull request metadata is revalidated

Every pull request workflow SHALL run again when the body, title or base branch
changes. The release and back-merge exemption SHALL apply only to the
repository's own `dev` or `main` branch.

**Source**: Issue #519
**Tests**: `.github/workflows/openspec.yml`, `.github/workflows/ci.yml`

#### Scenario: Edited body

- **WHEN** the pull request body, title or base branch changes
- **THEN** the artifact and risk checks run again

#### Scenario: Foreign branch name

- **WHEN** a fork pull request names its head branch `dev` or `main`
- **THEN** the specifications job still runs

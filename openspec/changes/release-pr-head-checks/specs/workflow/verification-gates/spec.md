## ADDED Requirements

### Requirement: History-dependent pull request checks run on the head commit

A pull request check that resolves commit history SHALL run on the pull-request
head commit, not on GitHub's synthetic merge commit, so a path has one first add.
The base SHALL still be fetched and passed to every comparison that names it. A
non-pull-request run SHALL use its triggering commit. No required job SHALL be
skipped or removed.

**Source**: Issue #519
**Tests**: `.github/workflows/ci.yml`, `scripts/archive-index.test.ts`

#### Scenario: Release pull request

- **WHEN** a `dev` → `main` release pull request holds archives whose dev origin
  differs from main's squash origin
- **THEN** the archive check reads the dev head and passes with its reviewed
  origins, while the base comparison still runs against `main`

#### Scenario: Synchronous merge ref

- **WHEN** the synthetic merge commit has two first adds for one archived path
- **THEN** the type check does not use that commit for history-dependent checks

#### Scenario: Manual run

- **WHEN** the workflow runs by `workflow_dispatch`
- **THEN** the checkout uses the triggering commit and every job still runs

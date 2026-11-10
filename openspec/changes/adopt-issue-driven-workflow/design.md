# Design

## Context

Issue #19 fixes the order of work: an official rule source, a formal
specification with examples, a failing test, a minimal implementation, a
refactor, a regression check. GitHub owns the work item. OpenSpec owns the
behavior contract. Tests own the proof.

The repository is static: no bundler, no package manager and no runtime
dependency. OpenSpec is an external CLI, so the consistency checker is plain
Node with no imports beyond `node:fs`, `node:path` and `node:process`.

## Pipeline

```
GitHub Issue  ->  OpenSpec change  ->  branch + PR  ->  CI  ->  owner merge  ->  sync / archive
     #19            proposal.md          template        unit      explicit      main specs
                    design.md           body fields     browser   "merge PR #N"  after verified
                    tasks.md                            openspec
                    specs/<cap>/spec.md
```

Each arrow is a gate:

1. **Issue → change.** The proposal names the issue. A change with no issue
   reference fails the checker.
2. **Change → PR.** The branch is created from the change name; the PR body
   names the change and the issue. The template asks for the evidence.
3. **PR → CI.** Unit tests, browser checks and OpenSpec validation all run.
4. **CI → merge.** Only the owner merges; an agent stops after reporting CI.
5. **Merge → sync.** Main specs change only after the behavior is verified.

## Baseline bootstrap

The main specs added by this change are a one-time import, not a delta. They
record only requirements already proven by a test at the time of writing. The
rules matrix stays the per-role audit table; the spec files state the durable
contract for a capability and cite the matrix's pinned wiki revisions.

Two rules keep the baseline honest:

- A requirement names at least one `**Tests**:` reference that exists.
- A mechanic that is partial, host-adjudicated or unsupported is not written as
  a requirement. It stays a `docs/rules-matrix.md` row or an issue #19 item.

## Checker contract

`scripts/openspec-check.mjs` reads the repository and reports every violation,
then exits non-zero. It checks:

- Each `openspec/specs/**/spec.md` has `## Purpose`, `## Requirements`, no
  delta operation header, and each requirement has at least one scenario plus
  `**Source**:` and `**Tests**:` lines.
- Each referenced test path exists.
- Each `openspec/changes/<name>/` has `proposal.md`, `design.md`, `tasks.md`
  and at least one delta spec; the proposal names an issue; `tasks.md` has an
  evidence block with `RED:` and `GREEN:` labels.
- With `--pr-body` and `--changed-files`, a PR that touches
  `openspec/changes/**` names its change and issue in the body.

The CLI-grade schema check stays in `openspec validate --specs --strict` and
`openspec validate --changes --strict`, run in the same CI job.

## Non-retroactivity

The PR body rule applies only when the pull request touches
`openspec/changes/**`. Old pull requests and merged history are not re-judged,
and no RED evidence is invented for them: their merged tests are the evidence.

## Rejected alternatives

- **A GitHub Action that copies issue checkboxes into specs.** The epic mixes
  verified, host-choice and unsupported work; copying it would claim support the
  engine does not have.
- **A generated test-to-requirement index.** A static index drifts; the
  file:line reference inside the requirement is small enough to maintain and is
  checked for existence.
- **A new dependency for the checker.** Node built-ins cover the reading and
  matching; a dependency would add a lockfile the repository does not have.

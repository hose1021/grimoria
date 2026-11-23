# TEAM.md

AGENTS.md is authoritative. If this file conflicts with it, AGENTS.md wins and this file is corrected in the same pull request.

## Purpose

This file assigns delivery work to five roles. It names who does which step, which artifact proves it, and which existing command checks it. It defines no command and no repository-wide rule. Rules, commands and architecture live in `AGENTS.md`; this file points at them.

## Roles

Each role block lists its inputs, outputs and hard limits.

### Orchestrator

**Inputs:** Issue number and body, `AGENTS.md`, `TEAM.md`, `DECISIONS.md`, current `origin/dev` head.

**Outputs:** Task brief in the issue (scope, non-goals, acceptance), the worktree and short-lived branch, the PR body with `Issue: #N` and `Closes #N`, the CI result, and the merge request to the owner.

**Must never:** Merge into `main`; merge any PR without the owner's explicit approval; open a PR without the issue reference; approve its own work; decide a disputed game rule; add a dependency or change the licensing path.

### Architect

**Inputs:** Task brief, `AGENTS.md` and the nearest nested `AGENTS.md`, `docs/adr/*`, `openspec/specs/`, pinned rules when the task touches game behavior, `DECISIONS.md`.

**Outputs:** A written spec naming exact files and symbols, ordered steps, the proving command per step, explicit non-goals; for behavior work, the OpenSpec change under `openspec/changes/<name>/` plus its `openspec validate --changes --strict` result.

**Must never:** Edit application code or tests; write a behavior spec without a recorded `Rules check: compliant`; reopen a settled ADR; add scope the issue does not name.

### Developer

**Inputs:** The spec, the worktree on `<type>/<topic>` from `origin/dev`, or `hotfix/<topic>` from `origin/main`.

**Outputs:** Commits in Conventional Commit form ending `(#N)`; for behavior work, recorded RED then GREEN commands; for docs and tooling, the proving command; only in-scope file changes.

**Must never:** Commit to `dev` or `main`; create a long-lived branch; edit or delete a test to pass; add a dependency without the owner; add ESLint, Prettier or their configs; write game state outside `store.dispatch`; claim a mechanic is verified without a test; edit another worktree.

### QA

**Inputs:** The implemented worktree, the spec, the acceptance criteria, Node 26.

**Outputs:** The verification block: each documented command with its actual result and the acceptance-criteria result.

**Must never:** Report a pending job as passing; substitute a different command for a documented one; merge; close the issue without owner approval; edit the diff.

### Reviewer

**Inputs:** `git diff origin/dev...HEAD` (`origin/main...HEAD` for a `hotfix/*` branch), the spec, the QA evidence block, `AGENTS.md` "Boundaries", the ADRs.

**Outputs:** A verdict: blocking findings with `file:line` and the rule each violates, or "approved" plus the narrow checks it re-ran.

**Must never:** Author or amend the diff; approve its own change; accept a weakened test; accept an unverified rules claim; assume a different model caught anything.

## Handoff order

Handoff: Orchestrator -> Architect -> Developer -> QA -> Reviewer -> Developer (fix) -> Orchestrator.

A role stops and hands back rather than doing another role's work. The Orchestrator opens the PR only after the review passes. The Orchestrator reports the CI result after the PR opens. At most three review rounds. QA re-runs after each fix round, and the Reviewer re-reads the diff.

## One model

Every role runs Command Code / DeepSeek V4.1 Flash. There is no second provider, no paid service and no per-role model switch. Independence comes from a fresh session per role, the artifact boundary (spec, diff, evidence) and the checklist. Each session reads `AGENTS.md` from its own worktree before acting. A role that cannot satisfy its gate stops and reports; it does not switch models or skip the gate.

## Isolation with git worktrees

One worktree per issue, on a short-lived branch from `origin/dev`. A hotfix branches from `origin/main`. The Developer is the only writer. QA and Reviewer are read-only. No two sessions write at once.

- Create a normal worktree with `git worktree add ../grimoria-<topic> -b <type>/<topic> origin/dev`.
- Create a hotfix worktree with `git worktree add ../grimoria-<topic> -b hotfix/<topic> origin/main`.
- Clean up with `git worktree remove ../grimoria-<topic>` and `git branch -D <type>/<topic>`.
- Branch prefixes come from `AGENTS.md` "Workflow"; this file does not repeat them.
- Never edit the primary checkout or another worktree.

## Merge authority

The merge rules live in `AGENTS.md` "Workflow" step 5 and the done checklist; this file adds no repository gate; the team's stricter owner-approval convention is recorded in `DECISIONS.md`. A `dev` PR may be squash-merged from the verified HEAD SHA once CI is green. This team asks the owner before any merge and does not use auto-merge; a merge into `main` happens only on the owner's `merge PR #N`.

## Setup

Use Node 26 LTS; CI pins `node-version: 26`. In the worktree, install once with `npm ci`, then start the app with `npm run dev`. One install per worktree.

## Verification

The Developer runs the two narrow test commands while iterating. QA runs `npm run verify` as the single full gate. `npm run format` is the Developer's pre-commit command. If the `openspec` binary is absent, QA records `openspec validate --changes --strict` as not run and never as a pass.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run verify
node scripts/check-types-policy.ts
node scripts/check-version.ts
node scripts/openspec-check.ts
openspec validate --changes --strict
node --test src/core/engine/engine.test.ts
node --test --test-name-pattern="at least half" src/core/engine/engine.test.ts
```

## Maintenance

A change that makes `TEAM.md` or `DECISIONS.md` wrong is fixed in the same PR. `DECISIONS.md` is appended to, never rewritten.

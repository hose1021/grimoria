# DECISIONS.md

AGENTS.md is authoritative. If this file conflicts with it, AGENTS.md wins and this file is corrected in the same pull request.

## Purpose

This file records why a delivery-process choice was made and what it costs. It is never normative. Rules live in `AGENTS.md`, assignments live in `TEAM.md`, and architecture lives in `docs/adr/`.

## Format

Each entry is a dated heading followed by exactly four bullets: `Date`, `Decision`, `Reason` and `Consequence`. Append new entries at the bottom. Do not rewrite an old entry; correct a later one with a new entry that supersedes it.

## 2026-11-23 - One model for every role

- Date: 2026-11-23
- Decision: All five roles run Command Code / DeepSeek V4.1 Flash.
- Reason: Issue #478 forbids a second provider; one model keeps cost and setup reproducible.
- Consequence: Role independence is procedural, not model-diverse. A shared blind spot is possible and must be caught by explicit checks.

## 2026-11-23 - Fixed split between the three documents

- Date: 2026-11-23
- Decision: `AGENTS.md` binds, `TEAM.md` assigns, `DECISIONS.md` records why.
- Reason: `AGENTS.md` already holds rules, commands and architecture; copying them drifts.
- Consequence: `TEAM.md` defines no command and keeps no architecture inventory. A conflict resolves to `AGENTS.md`.

## 2026-11-23 - Handoff order and one writer per worktree

- Date: 2026-11-23
- Decision: Work passes Orchestrator, Architect, Developer, QA, Reviewer, then a fix loop of at most three rounds through the Developer. One worktree per issue.
- Reason: One model and one worktree make concurrent writing unsafe and unverifiable.
- Consequence: Review and QA add latency but keep one diff and one HEAD for evidence.

## 2026-11-23 - Owner approval before any merge

- Date: 2026-11-23
- Decision: The Orchestrator reports green CI and waits. No auto-merge. `main` merges only on the owner's `merge PR #N`.
- Reason: The team keeps a human merge gate; for `main` it mirrors the owner's `merge PR #N` rule.
- Consequence: This team's self-imposed owner gate is stricter than the `AGENTS.md` permission to squash-merge a green `dev` PR; `AGENTS.md` itself is unchanged. Merges wait for a human message.

## 2026-11-23 - Commands are borrowed, not defined

- Date: 2026-11-23
- Decision: `TEAM.md` only assigns the `AGENTS.md` "Commands" block to roles.
- Reason: Duplicate command lists drift.
- Consequence: A new command goes into `AGENTS.md` first, and `TEAM.md` follows in the same PR.

## 2026-11-23 - Process decisions stay out of ADRs

- Date: 2026-11-23
- Decision: Architecture stays in `docs/adr/`; process and team choices go here.
- Reason: ADRs are contract-level and reviewed with engine changes.
- Consequence: A process decision that changes architecture also needs an ADR.

## 2026-11-23 - This change skips the OpenSpec change

- Date: 2026-11-23
- Decision: Issue #478 ships as a documentation-only change with no OpenSpec change.
- Reason: `AGENTS.md` Workflow step 1 permits it while the PR still names the issue.
- Consequence: The PR carries both issue lines, runs `node scripts/openspec-check.ts` and `openspec validate --changes --strict`, and changes no spec.

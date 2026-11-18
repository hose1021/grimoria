---
name: create-pr
description: >
  Create the worktree, branch, commits, push and GitHub pull request for
  Grimoria. Use when asked to create a branch, commit current changes, open a
  PR or draft PR, or recover from gh pr create failures. Covers the
  origin/dev worktree, branch prefixes and Conventional Commit titles with
  (#N), the pull request template and its Issue: / OpenSpec change: / Closes
  lines, CI verification, and the stop-before-merge rule.
metadata:
  internal: true
---

# Create PR

Use this skill when turning local work into a Grimoria pull request.

## Inspect first

```bash
git status --short
git branch --show-current
git diff -- <paths>
```

- Never commit, push or branch on `main` or `dev`.
- Stage only your own hunks. Other agents and the user may share the checkout:
  use `git add -p` when a file mixes hunks, and leave unrelated files alone.
- New functionality needs a GitHub issue and an OpenSpec change in
  `openspec/changes/<name>/`. Doc-only and typo changes that alter no behavior
  skip the change but still name an issue.

## 1. Worktree and branch

Non-hotfix work starts from current `origin/dev`, in its own worktree:

```bash
git fetch origin dev
git worktree add ../grimoria-<topic> -b <type>/<topic> origin/dev
```

A production hotfix branches from `origin/main`:

```bash
git worktree add ../grimoria-<topic> -b hotfix/<topic> origin/main
```

- `<type>` is one of `feat fix docs refactor test chore ci perf hotfix`; the
  rest is lowercase kebab-case (`scripts/check-git-conventions.ts` enforces it).
- Stacked work: branch from the unmerged PR's branch and target the new PR at
  it; retarget to `dev` after the dependency merges. Never merge a stack out
  of order.

## 2. Commit

```bash
git add <paths>
git diff --cached --check
git commit -m "<type>(<scope>): lowercase imperative subject (#N)"
```

- Every commit subject carries its issue reference `(#N)`; no trailing period.
- Types: `feat fix docs refactor test chore ci perf build style revert`.
- No generated-tool or co-author footers.
- Feature, fix and docs work adds a `## [Unreleased]` changelog entry and does
  not change `VERSION`.

## 3. Push and open the PR

```bash
git push -u origin <branch>
gh pr create --base dev --draft \
  --title "<type>(<scope>): subject (#N)" \
  --body-file <body.md>
```

- Base is `dev`. Only a `hotfix/*` PR and the `dev` → `main` release PR target
  `main`.
- The title becomes the squash commit: the conventions check reads it.
- Draft unless the user asks otherwise.

## PR body

Copy `.github/pull_request_template.md`, keep its headings, and fill each
section for a human reviewer: `What?`, `Why?` and `How?` carry what a reader
needs without opening the diff. Three lines are machine-read and must start at
column zero:

| Line | When |
|---|---|
| `Issue: #N` | PR touches `openspec/changes/**` |
| `OpenSpec change: <change-dir-name>` | same condition |
| `Closes #N` | the PR closes its issue |

GitHub resolves `Closes` on `main`, so a `dev` PR still states it. Keep the
closing line when the body is edited later.

Section content:

- **Rules and sources** — the pinned wiki `oldid` or the `docs/rules-matrix.md`
  row for every rule touched; `none` for tooling-only changes.
- **What? / Why? / How?** — the change and its motivation for the Storyteller
  or developer; implementation notes only where the diff is not
  self-explanatory.
- **Verification** — the commands that prove the PR. For a behavior change,
  name the command that failed before the change and passes after it;
  `tasks.md` keeps the `- RED:` and `- GREEN:` lines. For documentation,
  tooling or CI only: `not applicable` plus the check that proves the change.
- **CI** — pending at creation; report the actual result after the run.

Do not invent RED evidence for work that merged before this workflow existed;
cite the merged PR and its tests. Never weaken or delete a test to reach green.

## Verify before reporting

```bash
npm run verify                     # typecheck, lint, format, test, build, fallback, offline, policy
node scripts/openspec-check.ts
openspec validate --changes --strict
```

- Behavior change: RED and GREEN commands recorded. Docs or tooling: the one
  command that proves the result.
- Engine or UI change: app run at `http://localhost:8010/` with a real game
  state, route exercised, console clean, checked at ~390 px width.
- After the push: `gh pr checks --watch`. Never report a pending job as
  passing.

## Recovery

- The branch may already have a PR:
  `gh pr view --head <branch> --json url,isDraft,title` before creating a
  duplicate.
- Wrong base or title: `gh pr edit <n> --base dev --title "<title>"`; the
  conventions check reruns.
- `gh pr create` denied: report that the branch is pushed and the PR is not
  created, and give the exact corrected command.
- `.git` lock or `Operation not permitted`: rerun the same command with
  sandbox escalation inside the worktree. Check refs with
  `git branch --list`/`git worktree list` before blaming a namespace conflict.

## Stop after opening

Report the PR URL and the CI result, then stop. No merge, no auto-merge, no
approving your own change. Only an owner message `merge PR #N` authorizes that
one merge. Cleanup (worktree removal, local branch delete, back-merge, tag) is
a follow-up after the merge.

## Related skills

- `$openspec-propose` — create the change artifacts before implementation.
- `$openspec-apply-change` — implement the change tasks.
- `$openspec-archive-change` — archive the change after the merge.

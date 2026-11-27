# Workflow


Pipeline: `GitHub issue → OpenSpec change → branch + PR → CI → merge → sync/archive`;
the agent merges into `dev`, the owner merges into `main`.

1. **Issue.** New functionality starts from a GitHub issue. Doc-only and typo
   changes that alter no behavior may skip the OpenSpec change, but the PR still
   names the issue.
2. **OpenSpec change.** `openspec/changes/<name>/` with `proposal.md` (contains
   `Issue: #N`), at least one delta spec, `design.md`, `tasks.md`. Validate with
   `openspec validate --changes --strict`.
3. **Branch.** All non-hotfix work branches from current `origin/dev`, in its
   own worktree:
   `git worktree add ../grimoria-<topic> -b <type>/<topic> origin/dev`.
   A production hotfix branches from `origin/main`:
   `git worktree add ../grimoria-<topic> -b hotfix/<topic> origin/main`.
   Prefixes (identical to `scripts/check-git-conventions.ts`): `feat/ fix/ docs/
   refactor/ test/ chore/ ci/ perf/ hotfix/`. Rest is lowercase kebab-case.
   Edit, stage and commit only inside the worktree, including `/opsx-propose`
   artifacts. `main` holds released code; `dev` collects every other change and
   reaches `main` only as a release.
   When a change depends on an unmerged PR, branch from that PR's branch and
   target the new PR at it; retarget it to `dev` after the dependency merges.
   Never merge a stack out of order.
4. **RED → GREEN → REFACTOR.** For behavior changes: spec and scenarios first,
   then a failing test, then the fix; record both commands and results. For
   documentation, tooling and other non-behavior changes, record the command that
   proves the result instead.
5. **PR.** Targets `dev`, or the base branch of the dependency it stacks on
   (step 3). Only a `hotfix/*` PR and a release PR (`dev` → `main`) target
   `main`. Open it and run the checks; once CI is green, squash-merge a
   `dev`-targeted PR. A PR targeting `main` is reported and **left for the
   owner**. Review fixes go to the same branch. The body SHALL keep the
   `Issue: #N` line the specification check reads. A PR that closes its issue
   SHALL also carry a closing keyword line (`Closes #N`); the issue reference
   in the title alone is not enough. Write the closing line every time, and
   keep it when the body is edited. GitHub resolves the keyword on the default
   branch (`main`), so a PR into `dev` still states it. Before any merge verify
   the current HEAD SHA and the green CI result on it; a merge into `main` also
   needs the owner's permission for that exact PR. A release PR (`dev` → `main`)
   and a back-merge PR (`main` → `dev`) name no issue and no OpenSpec change in
   the body, and skip the `Specifications` job: the changes were validated in
   `dev` before the release. The title keeps the issue reference line only
   because the conventions check requires one.
6. **After merge.** Remove the worktree and local branch
   (`git worktree remove ../grimoria-<topic>`, `git branch -D <type>/<topic>`).
   A merge into `main` changes the version and creates tag `vX.Y.Z`; merge
   `main` back into `dev` at once, so a hotfix is not lost at the next release.
   These are follow-ups, not owner approvals (see **Versioning and releases**).
   Update main specs only from a verified change; archive it once `npm test`,
   `node scripts/openspec-check.ts` and `openspec validate --specs --strict` pass.

Commits and PR titles: Conventional Commits with the issue reference appended,
`type(scope): lowercase imperative subject (#N)`, where `#N` is the GitHub issue
the work belongs to. Optional scope; no trailing period (`feat(engine): correct
the Mayor redirect (#19)`). Types: `feat fix docs refactor test chore ci perf
build style revert` (`build`, `style` and `revert` are not branch prefixes;
`hotfix` is a branch prefix whose title uses `fix`). Every commit subject and
every PR title carries its issue reference, so GitHub links the commit to the
task. PRs are **squash-merged**; the PR title becomes the commit on `dev` or
`main`, and CI checks the type and the reference.

Spec rules: baseline specs in `openspec/specs/` describe behavior already proven
by a test; each requirement cites its official source and asserting test.
`openspec-check` proves the cited file exists, not that it asserts the
requirement, so requirement-level verification stays a review task. Partial,
host-adjudicated and unsupported mechanics stay as `docs/rules-matrix.md` rows or
issue items, not spec requirements.

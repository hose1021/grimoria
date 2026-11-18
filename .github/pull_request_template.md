## GitHub Issue

<!-- Required. Use a number, e.g. "Issue: #19". Replace N in the closing line,
     or delete that line when this pull request does not close its issue.
     GitHub resolves the keyword on main, so a pull request into dev still
     states it. -->

Issue:

Closes #N

## OpenSpec change

<!-- Required when this pull request touches openspec/changes/**. Use the
     change directory name. Documentation-only pull requests state why none
     applies. -->

OpenSpec change:

## Rules and sources

<!-- Cite the official wiki revision (oldid) or docs/rules-matrix.md row for
     every rule this change touches. Write "none" for tooling-only changes. -->

## What?

<!-- What changed, from the Storyteller or developer perspective. -->

## Why?

<!-- The problem this solves. Omit only when the change explains itself. -->

## How?

<!-- Only what the diff does not make obvious. Keep it short. -->

## Verification

<!-- Commands that prove this pull request. For a behavior change, name the
     command that failed before the change and passes after it. For a
     documentation, tooling or CI-only change, write "not applicable" and the
     check that proves the result. Do not repeat commands CI already runs. -->

- `<command that passed>`
- Not run: `<command>` (`<reason>`)

## CI

<!-- Link or result of the Unit tests, Playwright regression checks and
     OpenSpec jobs. -->

## Checklist

- [ ] The change is linked to an issue and an OpenSpec change.
- [ ] A failing test existed before the implementation, or this pull request states why none applies.
- [ ] No test was weakened or removed to make CI pass.
- [ ] `docs/rules-matrix.md` is updated when a role status changes.
- [ ] The pull request title is a Conventional Commit ending with the linked issue reference `(#N)`.
- [ ] The base branch follows GitFlow: `dev` for normal work; `main` only for a `hotfix/*` or the release pull request.
- [ ] A merge into `main` updates `VERSION`, `package.json` and `CHANGELOG.md` to the new version.
- [ ] Main specs were not edited directly; they are updated from the change after verification.
- [ ] This pull request is not merged by the agent; the owner decides the merge.

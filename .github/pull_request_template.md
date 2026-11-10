## GitHub Issue

<!-- Required. Use a number, e.g. "Issue: #19". -->

Issue:

## OpenSpec change

<!-- Required when this pull request touches openspec/changes/**. Use the change directory name. -->

OpenSpec change:

## Rules and sources

<!-- Cite the official wiki revision (oldid) or docs/rules-matrix.md row for every rule this change touches. Write "none" for tooling-only changes. -->

## RED evidence

<!-- For a behavior change: the command and the observed failure before the fix.
     For a documentation, tooling or CI-only change: "not applicable" and the check that proves the change.
     Do not invent RED evidence for work that merged before this workflow existed: cite the merged PR and its tests instead. -->

## GREEN evidence

<!-- The same command after the change, and the passing result. -->

## Regressions

<!-- Tests added or updated, and what each one protects. -->

## CI

<!-- Link or result of the Unit tests, Playwright regression checks and OpenSpec jobs. -->

## Limitations

<!-- Behavior still validated by the host, unsupported combinations, or anything the tests do not prove. -->

## Checklist

- [ ] The change is linked to an issue and an OpenSpec change.
- [ ] A failing test existed before the implementation, or this PR states why none applies.
- [ ] No test was weakened or removed to make CI pass.
- [ ] `docs/rules-matrix.md` is updated when a role status changes.
- [ ] Main specs were not edited directly; they are updated from the change after verification.
- [ ] This PR is not merged by the agent; the owner decides the merge.

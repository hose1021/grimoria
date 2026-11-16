# Specifications workflow

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root (with the configured RTK wrapper).

Read `config.yaml` and the relevant existing specs before authoring a change. Behavior work needs an issue-linked proposal, delta spec with scenarios, design and tasks before implementation.

Change PRs target `dev`, or the base branch of the dependency they stack on. Only a `hotfix/*` PR and a release PR (`dev` → `main`) target `main`; a merge into `main` bumps the version under the root AGENTS.md "Workflow" and "Versioning and releases".

For behavior changes record real RED and GREEN commands and results in task evidence; for documentation and tooling changes record the command that proves the result. Never weaken a requirement or test to obtain a passing check. Documentation-only changes may skip a change under the root policy.

Main specs describe tested behavior and cite official sources plus asserting tests. Sync/archive only after the owner merges the change into `dev` and the required verification passes; the release PR carries the synced specs to `main`. Do not rewrite historical archive artifacts for current behavior.

Check from the root: `node scripts/openspec-check.ts`, `openspec validate --changes --strict` and `openspec validate --specs --strict`.

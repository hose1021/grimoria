# Specifications workflow

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root (with the configured RTK wrapper).

Read `config.yaml` and the relevant existing specs before authoring a change. Behavior work needs an issue-linked proposal, delta spec with scenarios, design and tasks before implementation.

Record real RED and GREEN commands/results in task evidence; never weaken a requirement or test to obtain a passing check. Documentation-only changes may skip a change under the root policy.

Main specs describe tested behavior and cite official sources plus asserting tests. Sync/archive only after owner merge and the required verification; do not rewrite historical archive artifacts for current behavior.

Check from the root: `node scripts/openspec-check.mjs`, `openspec validate --changes --strict` and `openspec validate --specs --strict`.

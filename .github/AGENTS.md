# GitHub automation

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root (with the configured RTK wrapper).

Keep workflow permissions minimal and preserve required checks and owner-controlled squash merges. Never add auto-merge or self-approval.

Use the existing Node 24 and pinned tool versions consistently. Deployment publishes `dist/`, including generated fallback/offline files; retain project-subpath support.

Keep PR issue/spec references and Conventional Commit validation aligned with repository policy. Documentation-only PRs may omit an OpenSpec change with an explicit reason.

Validate affected commands locally and inspect the actual PR checks after pushing; do not report pending jobs as passing.

# Proposal

Issue: #519

## Why

The 2026-11-27 tree carried duplicated rule metadata in Markdown dossiers, a
hand-synchronized rules matrix, an archive index that depended on intermediate
PR commits, and instruction documents that repeated binding rules. Verification
passed more often on unit tests than on the real files. The owner asked for
risk-based lightweight SDD + TDD where machine-readable evidence is the source
of the generated views and every gate checks committed artifacts.

## What Changes

- Make `rules/*.json` the only rule metadata: delete the 72 per-role dossiers
  and the legacy exporter; acceptance, traceability and the dossier tool read
  the registry.
- Check the matrix against the registry for all 172 identifiers, including the
  42 shared `SYS-` rows; generate its requirement column from the registry.
- Keep the OpenSpec archive in Git with an append-only index, complete tree
  hashes, a current baseline and an original anchor; fail on missing, malformed,
  duplicated or deleted records.
- Enforce risk-dependent artifacts: an R3 change names a same-issue OpenSpec
  change with proposal, design, tasks and a delta spec; a verification-policy
  migration may declare `Policy migration: true` instead of adding gameplay
  specifications.
- Collapse the delivery guidance into `AGENTS.md` (owner approval for every
  merge, worktree isolation, review until acceptance) and keep durable decisions
  in `docs/adr/`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow/verification-gates`: risk-dependent artifact evidence, archive
  protection and citation parity become gates rather than conventions.

## Impact

- Tooling: `scripts/{check-acceptance,check-risk-tier,check-risk-artifacts,
  archive-index,sync-rules-matrix,role-ownership,rule-registry,rule-traceability}.ts`
  and their tests; `scripts/verification/`.
- Records: `AGENTS.md`, `docs/AGENTS.md`, `docs/rules-sources.md`,
  `docs/adr/0005-runtime-boundaries.md`, `docs/rules-matrix.md`, `DECISIONS.md`.
- Untouched: engine behavior, saved-state schema, dependencies, official source
  pins and the 172 rule identifiers.

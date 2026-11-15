# Project evidence and rule sources

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root (with the configured RTK wrapper).

Rules authority is defined in the root AGENTS.md "Rules sources": the pinned wiki revisions are normative; `docs/reference/` is an auxiliary digest. Do not restate or extend that order here.

## Sources in this subtree

- `official/manifest.json` — provenance for every file in `official/`. `node scripts/check-official.mjs` verifies hashes and pin coverage offline.
- `official/wiki/` — the fetched pinned revisions, gitignored under the licensing gate. `node scripts/fetch-official.mjs` fetches them; `--check` reports drift and never rewrites a pin.
- `reference/` — the generated per-role digest, gitignored under the same gate. Build with `node scripts/build-official-roles.mjs`; `--check` fails on a missing, stale or extra file and on an empty or unconverted section.
- `rules-matrix.md` — the only place that pins a revision, plus the per-role status table.
- `evidence/` — before/after screenshots. `improvement-research.md` and `improvement-implementation.md` are dated snapshots, advisory only.

## When a source is missing

If the snapshots or the reference are absent, read the permanent `oldid` URL from the matrix row. If no source is reachable, do not guess a rule: keep the mechanic `host-choice` or `unsupported` and ask the owner.

## Evidence discipline

Distinguish verified behavior, host-adjudicated mechanics and research suggestions. Do not promote a matrix row or research note into a verified claim without an asserting test.

For rule changes cite the pinned official source/revision and the relevant test; resolve ambiguity with the owner. Preserve provenance in `official/` snapshots and before/after evidence in `evidence/`.

Keep architecture descriptions aligned with current layer boundaries. Link to authoritative specs/source instead of duplicating inventories and test counts.

Check: `node scripts/openspec-check.mjs` when changing spec/source references; verify local links and referenced test files.

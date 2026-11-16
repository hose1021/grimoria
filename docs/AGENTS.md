# Project evidence and rule sources

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root (with the configured RTK wrapper).

Rules authority is defined in the root AGENTS.md "Rules sources": the pinned wiki revisions are normative; `docs/reference/` is an auxiliary digest. Do not restate or extend that order here.

## Sources in this subtree

- `official/manifest.json` — provenance for every file in `official/`. `node scripts/check-official.ts` verifies hashes and pin coverage offline.
- `official/wiki/` — the fetched pinned revisions, gitignored under the licensing gate. `node scripts/fetch-official.ts` fetches them; `--check` reports drift and never rewrites a pin.
- `reference/` — the generated per-role digest, gitignored under the same gate. Build with `node scripts/build-official-roles.ts`; `--check` fails on a missing, stale or extra file and on an empty or unconverted section.
- `rules-matrix.md` — the only place that pins a revision, plus the per-role status table. Every supported row carries exactly one rule identifier in its first column: a role identifier for role rows, a `SYS-` identifier for shared rows.
- `rules-shared.md` — the declaration for every `SYS-` identifier used by a shared matrix row, with the row's level, source and asserting tests.
- `role-ownership.md` — the generated role-by-role ledger: module declarations, coordinator references and rule identifiers. Build with `node scripts/role-ownership.ts`; `--check` fails on a stale ledger.
- `evidence/` — before/after screenshots. `improvement-research.md` and `improvement-implementation.md` are dated snapshots, advisory only.

## When a source is missing

Follow the root AGENTS.md **Rules sources** recovery sequence: automatically
fetch missing pinned snapshots, verify provenance, rebuild a missing or stale
reference, and read the actual wiki text. Use the permanent `oldid` URL only
when local recovery fails. If neither source is readable, report the failed
attempts and stop without guessing a rule or changing behavior.

## Evidence discipline

Distinguish verified behavior, host-adjudicated mechanics and research suggestions. Do not promote a matrix row or research note into a verified claim without an asserting test.

For rule changes cite the pinned official source/revision and the relevant test; resolve ambiguity with the owner. Preserve provenance in `official/` snapshots and before/after evidence in `evidence/`.

Keep architecture descriptions aligned with current layer boundaries. Link to authoritative specs/source instead of duplicating inventories and test counts.

Check: `node scripts/openspec-check.ts` when changing spec/source references; verify local links and referenced test files.

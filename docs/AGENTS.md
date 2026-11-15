# Project evidence and rule sources

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root (with the configured RTK wrapper).

## The role reference is the anchor

`docs/reference/` answers how a role is played: when it wakes, what the Storyteller does, which information it receives and which jinxes apply. Read it before engine code, tests or the matrix when you change role behavior.

- One role: `docs/reference/roles/<roleId>.md`.
- One scenario: `docs/reference/scenarios/{tb,bmr,snv}.md`.
- The full list: `docs/reference/README.md`.

The reference is generated from the pinned revisions in `docs/official/manifest.json` and the official `roles.json` and `jinxes.json`. Never edit it by hand. Change the pin or the snapshot, then rebuild:

```sh
node scripts/fetch-official.mjs        # fetch the pinned revisions (network)
node scripts/build-official-roles.mjs  # regenerate docs/reference/
```

`docs/official/wiki/` and `docs/reference/` are ignored by git until the owner permits committing wiki text. In a fresh clone both are absent: generate them before relying on them, and treat the wikitext snapshot as the lossless source.

## What the reference decides

- The reference states what the official rule says. `docs/rules-matrix.md` states whether the engine automates it and which test asserts it. `openspec/specs/` states the verified behavior.
- When code and the reference disagree, the code is wrong unless a spec and a passing test pin the current behavior. Report the conflict instead of editing a requirement.
- The reference is not a test. Do not mark a matrix row `verified` or add a spec requirement because the reference says so; a named passing test must assert it.
- When the reference is silent about an interaction, the mechanic stays `host-choice` or `unsupported`. Ask the owner; do not invent a rule.

## Evidence discipline

Distinguish verified behavior, host-adjudicated mechanics and research suggestions. Do not promote a matrix row or research note into a verified claim without an asserting test.

For rule changes cite the pinned official source/revision and the relevant test; resolve ambiguity with the owner. Preserve provenance in `official/` snapshots and before/after evidence in `evidence/`.

See `docs/official/README.md` for snapshot provenance and run `node scripts/check-official.mjs` after changing a file under `official/`.

Keep architecture descriptions aligned with current layer boundaries. Link to authoritative specs/source instead of duplicating inventories and test counts.

Check: `node scripts/openspec-check.mjs` when changing spec/source references; verify local links and referenced test files.

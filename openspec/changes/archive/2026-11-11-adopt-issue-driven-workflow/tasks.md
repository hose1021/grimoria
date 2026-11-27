# Tasks

## 1. Baseline specifications

- [x] 1.1 Add `openspec/specs/game/setup/spec.md` from the verified composition, bag, mask and preset tests.
- [x] 1.2 Add `openspec/specs/game/command-engine/spec.md` from the command, atomicity, idempotency, determinism and invariant tests.
- [x] 1.3 Add `openspec/specs/game/trouble-brewing/spec.md` from the verified Trouble Brewing tests.
- [x] 1.4 Add `openspec/specs/game/bad-moon-rising/spec.md` from the verified Bad Moon Rising tests.
- [x] 1.5 Add `openspec/specs/game/sects-and-violets/spec.md` from the verified Sects and Violets tests.
- [x] 1.6 Add `openspec/specs/game/day-and-win/spec.md` from the voting, execution and win-order tests.
- [x] 1.7 Add `openspec/specs/game/state-and-storage/spec.md` from the persistence, migration and import tests.
- [x] 1.8 Add `openspec/specs/game/custom-scripts/spec.md` from the parsing, rejection and manual-only tests.
- [x] 1.9 Add `openspec/specs/app/ui-and-privacy/spec.md` from the projection, string-parity and browser checks.
- [x] 1.10 Add `openspec/specs/app/offline/spec.md` from the offline worker tests.

## 2. Workflow change

- [x] 2.1 Write the proposal, delta spec, design and this task list for `workflow/change-lifecycle`.
- [x] 2.2 Add `scripts/openspec-check.mjs`.
- [x] 2.3 Add `.github/workflows/openspec.yml`.
- [x] 2.4 Add `.github/pull_request_template.md`.
- [x] 2.5 Add the issue → change → PR → CI → merge → sync policy to `AGENTS.md`.
- [x] 2.6 Point `docs/rules-matrix.md` at the OpenSpec baseline.

## 3. Verification

- [x] 3.1 `openspec validate --specs --strict` passes.
- [x] 3.2 `openspec validate --changes --strict` passes for this change.
- [x] 3.3 `node scripts/openspec-check.mjs` passes.
- [x] 3.4 `node --test js/*.test.mjs` keeps 167 tests passing.
- [x] 3.5 The conventions check accepts this branch and title, and rejects a malformed pair.

## 4. Branch and commit conventions

- [x] 4.1 Add the Branching Strategy and Commit Messages policy to `AGENTS.md`.
- [x] 4.2 Add `scripts/check-git-conventions.mjs` and `.github/workflows/git-conventions.yml`.
- [x] 4.3 State the checker limit in `AGENTS.md`, the checker header and `design.md`.
- [x] 4.4 Use one branch-prefix list in `AGENTS.md` and `scripts/check-git-conventions.mjs`.
- [x] 4.5 State the squash-merge strategy: the PR title is the checked commit subject; per-commit checking stays optional.

## Evidence

- RED: not applicable. This change adds documentation, a checker and CI; no
  runtime behavior changes and no test result changes. The proving check is
  `node scripts/openspec-check.mjs` run against the new artifacts.
- GREEN: `openspec validate --specs --strict`, `openspec validate --changes
  --strict`, `node scripts/openspec-check.mjs` and `node --test js/*.test.mjs`
  pass.

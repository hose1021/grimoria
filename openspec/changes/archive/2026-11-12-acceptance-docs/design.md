# Design

## Problem

Three artefacts described character support independently:

1. `docs/rules-matrix.md` recorded a per-row status, but its `Test` cells used
   `file.test.mjs:line`. Test files grew, so a citation could point at an
   unrelated passing test while the row still said `verified`.
2. `src/core/model/support.ts` held `ROLE_SUPPORT`, derived from the matrix by
   `js/support.test.mjs`. It still listed the tested Goon as `unsupported` and
   the untested Empath as `verified`.
3. `src/ui/screens/rules.ts` kept a second `BMR_ROLE_SUPPORT` table with five
   entries. The secrets screen rendered only those, so every other role was
   silently absent, and the Goon was shown as automated while the matrix said
   `unsupported`.

The README described Bad Moon Rising and Sects & Violets as wholly
host-adjudicated, which contradicted the engine and the matrix.

## Decision

- Cite tests by file and **test name**: `` `engine.test.mjs` "…" ``. A name is
  stable under line shifts and the acceptance check can match it against the
  test runner output.
- Keep one support source: `ROLE_SUPPORT` in `src/core/model/support.ts`, still
  derived from the matrix. Add `roleSupportEntries(roles)`, which returns an
  entry for every requested role, including an unknown one, and maps the level
  to the screen status (`verified`, `host-choice`, `unsupported`).
- Delete `BMR_ROLE_SUPPORT` and `bmrRoleSupport`; the secrets screen and the
  step cards call `roleSupportEntries` and `scriptSupport` instead.
- Render the script support level and the counts in all three secrets branches.
  List only the roles that need manual resolution, so the screen states the
  same level as the README table.
- Add `scripts/check-acceptance.mjs` and include it in `npm run verify`:
  - parse every matrix row whose status is `verified`;
  - require a named citation and resolve it against `node --test` TAP output;
  - reject any remaining `test.mjs:<line>` citation anywhere in the matrix;
  - recompute each role level from the matrix and compare it with
    `ROLE_SUPPORT`;
  - require one screen entry per supported role and an explicit `unsupported`
    entry for an unknown character;
  - compare the README support table with `scriptSupport` for the three
    scenarios;
  - fail when a second support table reappears.

## Alternatives

- Keep line-number citations and pin them to the audit commit. Rejected: the
  check would pass while the current test file no longer contains the test,
  which is the drift this change exists to stop.
- Generate the README table from the model. Rejected as unnecessary tooling; a
  checked table keeps the README readable and the check catches divergence.
- Add a new character-support capability. Rejected: this is a workflow
  guarantee about documentation and UI accuracy, so it belongs in
  `workflow/change-lifecycle`.

## Risks

- A test name that mentions a role but does not assert the row can still pass
  the check. The check proves the citation resolves and passes, not semantic
  equivalence; requirement-level review remains necessary. The matrix now cites
  the test names, so review can spot a wrong one.
- The Empath is downgraded rather than fixed with a new test. That is deliberate:
  the audit must not claim automation it cannot prove. A later change can add
  the asserting test and restore `verified`.
- The secrets screen now lists every non-verified role, which is longer than the
  previous five-entry list. This is the explicit cost of never hiding a manual
  fallback.

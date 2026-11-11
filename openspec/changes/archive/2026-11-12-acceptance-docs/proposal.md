# Proposal

Issue: #46
Parent: #19

## Why

The documentation, the rules matrix and the UI drifted from the engine. The
matrix cited line numbers that no longer resolve to the behaviour after test
suites grew. The Goon was automated and tested but the matrix still marked it
`unsupported` while the secrets screen showed it as automated. The Empath was
marked `verified` although no test asserts its computed neighbour count. The
secrets screen kept a second, five-entry Bad Moon Rising support table that
silently omitted every other role, so a role could fall from automated to
manual without any warning. The README claimed only Trouble Brewing and Bad
Moon Rising were covered and did not state the real support level per scenario.

This change is the documentation and UI accuracy slice of Stage 5 (#46).

## What Changes

- Replace every line-number test reference in `docs/rules-matrix.md` with a
  test file and test name, so a moved test cannot leave a stale citation.
- Add `scripts/check-acceptance.mjs`: every `verified` matrix row must cite at
  least one existing, passing test by name; the support model must match the
  matrix; the README table and the secrets screen must report the same counts;
  and every character must have a screen entry, including an unknown one.
- Correct the real drifts the check exposes: mark the automated Goon `verified`
  and the unasserted Empath `implemented-unverified`, derive the screen support
  entries from the one `ROLE_SUPPORT` model, list every non-verified role on the
  secrets screen for all three scenarios, and state the per-scenario counts in
  the README.
- Keep the existing support-level tests and add a regression that a character
  never falls back to manual silently.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow/change-lifecycle`: adds the documentation-accuracy requirement that
  verified matrix rows cite passing tests, the support model and the user-facing
  screens agree with the matrix, and a manual fallback is never silent.

## Impact

- Checks: `scripts/check-acceptance.mjs`, `package.json` (`verify`).
- Model/UI: `src/core/model/support.ts`, `src/core/model/rules.ts`,
  `src/ui/screens/secrets.tsx`, `src/ui/screens/table/cards.tsx`,
  `js/locales/{ru,en,az}.js`.
- Tests: `js/support.test.mjs`, `js/bmr.test.mjs`.
- Docs: `docs/rules-matrix.md`, `docs/rules-sources.md`, `README.md`.
- No schema change, migration or new dependency.

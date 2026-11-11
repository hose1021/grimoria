# Proposal

Issue: #37
Parent: #19

## Why

Five Bad Moon Rising roles were still listed without a tested decision: the Goon
had no engine handling, the Lunatic's mask and Demon report had no asserting
test, and the Pacifist and Tinker controls were host choices without a visible
support status in the UI. The Mastermind row already claimed the team-loss rule
but only the good-execution half was asserted. The matrix and the table must
show what is automated and what the host decides, and no manual control may look
like a fully automated rule.

## What Changes

- Automate the Goon: the first player to choose the Goon each night becomes
  drunk immediately, so their ability does not work, and the Goon takes that
  player's alignment until the next dusk; a later chooser in the same night
  changes nothing, an impaired Goon grants nothing, an already-impaired chooser
  still triggers, and the Lunatic's simulated choice and the Grandmother's pick
  do not.
- Report the Lunatic to the real Demon: the night-one Demon information names
  the Lunatic, and every Demon role step carries the Lunatic's name and last
  choice; the Lunatic's own choice still kills no one.
- Lock both Mastermind outcomes: a good player executed on the extra day loses
  for good, and an evil player executed there loses for evil.
- Expose each Stage 2 role's support status (`verified`, `host-choice`,
  `unsupported`) with its Storyteller-facing detail on the scenario secrets
  screen and on the affected step cards. The Pacifist and Tinker stay
  `host-choice` with their existing legal controls and a visible reason.
- Move the Goon and Lunatic matrix rows to `verified` with test references and
  update the Bad Moon Rising limitations, test counts and warning copy.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game/bad-moon-rising`: adds the Goon trigger, the Lunatic mask and Demon
  report, the Mastermind team-loss decision, and the support-status contract for
  the audited roles.

## Impact

- Runtime: `src/core/engine/bmr.ts`, `src/core/engine/information.ts`,
  `src/core/model/rules.ts`.
- UI: `src/ui/screens/secrets.tsx`, `src/ui/screens/table/cards.tsx`,
  `src/ui/screens/table/helpers.ts`, `js/locales/{ru,en,az}.js`.
- Tests: `js/bmr.test.mjs`.
- Docs: `docs/rules-matrix.md`, `docs/rules-sources.md`.
- No schema change, migration or new dependency.

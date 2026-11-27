# Design

## Context

The pinned Philosopher r2421 Summary says:

> If the Philosopher chose a character that was not in play at the time but is
> in play now, that character is drunk.

The engine had two writes that bypassed that sentence:

1. `transformationFacts.roleInPlay` in `src/core/engine/sv.ts` counted
   `used.philosopherAbility` as a character in play. The Pit-Hag's "if not in
   play" condition therefore refused to create the chosen absent character.
2. The direct Fang Gu jump in `recordSvOutcome` wrote `roleId = "fanggu"` and
   killed the old Demon without calling `reconcilePhilosopherDrunk`. A
   Philosopher drunk left over the jump kept pointing at the old seat.

`manualCorrection` (`kind: "role"`) also wrote the corrected character directly
and never reconciled the effect, so a correction could create the chosen
character with no drunk.

## Decision

- "In play" means a seat holds the character. A borrowed ability is an ability,
  not a character, so `roleInPlay` is `holderOf(state, candidate) != null`.
  `replaceCharacter` already calls `reconcilePhilosopherDrunk`, so the Pit-Hag
  creation makes the new holder drunk.
- Export `reconcilePhilosopherDrunk` and call it from the `kind: "role"`
  correction after the new character and team are written.
- Call `reconcilePhilosopherDrunk` at the end of the Fang Gu jump branch, after
  the new Fang Gu is set and the old Demon is killed. The chosen Outsider left
  play, so the effect is deactivated; if a current holder exists, the effect
  follows it.

No new mechanism is introduced: the effect, its keys, its source impairment and
its death rules stay exactly as they were. The change only makes every writer
of a character reach the existing reconcile.

## Risks / Trade-offs

- `reconcilePhilosopherDrunk` is now exported from `sv.ts`; `corrections.ts`
  already imports `reconcileNoDashiiPoison` from the same module, so no new
  dependency direction is introduced.
- The Pit-Hag may now create a character whose ability the Philosopher borrowed
  even while the Philosopher borrows it. The pinned Summary says both holders
  exist and the chosen character's owner is drunk; no duplicate is created in
  the roster because the borrowed ability is not a seat.
- A jumped Fang Gu replaces an Outsider's character directly. The reconcile
  reads the current seat, so the old dead holder cannot stay drunk.
- The register edit is evidence bookkeeping, not a behavior claim.

## Test plan

- `src/core/engine/snv.test.ts`: the rewritten later-character test asserts the
  Pit-Hag creation and the new holder's drunk; a role correction asserts the
  same through `manualCorrection`; the Fang Gu jump test asserts the effect
  leaves the new holder sober.
- The same file gains or extends the nineteen branch tests listed in the
  proposal, each named with its role identifier.
- `docs/audits/rule-exceptions/snv.json` maps each new test with exact
  `file::test name — assertion` evidence and re-pins the source rows.
- Regenerate `test-manifest.json`, `traceability.json`, `uncovered.json`, the
  rendered matrices and `docs/audits/release-readiness.md`.
- Run the focused engine suite, `npm test`, `npm run typecheck`,
  `npm run format:check`, `npm run verify` and the verification gates.

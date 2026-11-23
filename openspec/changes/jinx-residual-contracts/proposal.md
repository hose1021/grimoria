# Jinx residual contracts

Issue: #475

## Why

The verified-jinx change left four engine-contract gaps outside the normal UI
path. None is a missing official rule, but each makes the engine disagree with
its own pinned behavior when a command sequence is legal but unusual:

- A Demon step completed before the Lunatic step wrote no Mathematician mark.
- A Demon that died during its own attack was excluded from the comparison by
  an alive check, even though the ability had acted.
- A Drunk shown the Sage was marked unconditionally, because a player-pair
  answer had no true set to compare.
- The Sage's implied Recluse registration had no deterministic replay test.

## What changes

- The Lunatic comparison is decided by the completion that closes the pair:
  the Demon step, or a later Lunatic step. The mark stays in the existing
  `state.abnormal` ledger and is written at most once per night.
- A later Lunatic completion does not write a mark after the Mathematician has
  cleared the ledger.
- The Demon's live state no longer gates the comparison; a completed step that
  acted is enough.
- The Sage's true pair set is computed once and shared by the answer and by the
  Drunk jinx. The set contains the Demon that killed the Sage and an unimpaired
  Recluse, as the pinned Recluse+Sage jinx requires.
- A Drunk shown the Sage wakes for the death-triggered pair step, may be given
  any pair, and is marked only when the pair is not in the true set. No Recluse
  registration is recorded for a Drunk, because the Drunk has no Sage ability.
- The Sage registration is rederived from the recorded pair on replay; a new
  test proves the replayed canonical state matches.
- One command-behavior version, `DEMON_ATTACK_SOURCE_RULESET_VERSION`, marks
  the first version that records the Demon flag. Earlier journals keep their
  death record and do not gain a Sage step.
- No storage schema or command payload changes.

## Impact

- Changed: `src/core/engine/sv.ts`, `src/core/engine/night.ts`,
  `src/core/roles/sage/role.ts`, `src/core/engine/jinxes.test.ts`,
  `src/core/model/interactions.ts`, the readiness and audit reports.
- Added: this OpenSpec change.
- Out of scope: Al vs Al characters, Travellers/Fabled/Loric, new jinx pairs.

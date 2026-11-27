# Verified official jinx behaviors

Issue: #475

## Why

The script-agnostic engine can compose mixed-edition scripts, but all seven
official jinx pairs were explicitly `unsupported`: the registry carried their
pinned text but no behavior and no asserting test. A mixed pool containing one
remained manual-only, and the Mathematician, Sage, Mastermind and Fang Gu
interactions were not truthful.

## What changes

- All seven official jinxes gain a behavior through the existing role,
  information, transformation, abnormal, death and win paths. No second engine
  or ledger is added.
- The interaction registry marks all seven `verified` with the asserting test.
- `Chambermaid` owns its answer in an `information` capability and counts the
  whole night's wake set, including a later Mathematician.
- `Drunk` and `Lunatic` write the existing ABNORMAL mark through a deterministic
  step-completion hook when the pinned jinx applies.
- `Fang Gu` possession and every Demon death leave the Scarlet Woman a Minion
  when another living Demon remains.
- `Goon` created by `Pit-Hag` from an evil player keeps its evil alignment.
- `Mastermind` killed by `Vigormortis` keeps the ability after the Vigormortis
  dies and still arms the extra day.
- `Sage` may show a pair naming a Recluse and journals the implied Demon
  registration.
- The remaining legacy `nightStep`/`firstNightStep` declarations for
  Courtier, Godfather, Gossip, Grandmother, Moonchild, Professor, Ravenkeeper,
  Undertaker and Zombuul move onto `night-step` capabilities.
- No storage, command payload or ruleset version changes.

## Impact

- Changed: `interactions.ts`, the seven role modules, `bmr.ts`, `sv.ts`,
  `information.ts`/`information-facts.ts`, `night.ts`, `death.ts`,
  `retention.ts`, `support.test.ts`, `script-definition.test.ts`,
  `mixed.test.ts`, the rules matrix and role ownership.
- Added: `jinxes.test.ts`, a new OpenSpec change and ADR 0004.
- Remaining #211 completion adapters are listed with a reason in
  `docs/audits/211-remaining-adapters.md`; the legacy step declarations are now
  migrated.
- Out of scope: Al vs Al characters, Travellers/Fabled/Loric and any new
  character ability.

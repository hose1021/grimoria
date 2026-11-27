# Proposal

Issue: #41
Parent: #19

## Why

The Sects & Violets release implements only part of the scenario's printed
abilities, and `docs/rules-matrix.md` records the rest as
`implemented-unverified` or `unsupported`: the Vigormortis minion behaviour,
the Vortox's false information, the Juggler count, the Dreamer target rule, the
Flowergirl, Town Crier, Mathematician, Oracle, Sage and Seamstress information,
the Klutz loss and the Sweetheart drunk. The Juggler step also returns a
hard-coded `0` as its answer, which is a false number regardless of the actual
guesses, and the Klutz has no death step or loss condition at all.

## What Changes

- Add a RED-to-GREEN test for every listed mechanic in `js/snv.test.mjs` from
  the pinned official text in `docs/official/roles.json`.
- Compute the information the engine owns: the Oracle count, the Seamstress
  same-alignment answer, the Flowergirl's "a Demon voted today", the Town
  Crier's "a Minion nominated today" and the Juggler's correct-guess count.
- Record the Juggler's first-day guesses through a new `jugglerGuess` command
  (at most five, one per target) and through the day console; the night count
  is derived from the players' characters, never a constant.
- Require the host's answer for a computed Townsfolk information step when the
  Vortox is in play and unimpaired or when the actor is impaired, so false
  information is explicit instead of silently true.
- Give the Vigormortis its minion behaviour: a Minion it killed keeps its
  ability while a living, unimpaired Vigormortis exists, and poisons one
  Townsfolk neighbour.
- Give the Klutz its death step and loss condition in the engine's win check.
- Enforce the Dreamer and Seamstress target rules.
- Move the listed matrix rows to `verified`, or to an explicit `host-choice`
  with the host's allowed options, and update the known-limit wording.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game/sects-and-violets`: verifies the Vigormortis minion behaviour, Vortox
  false information, Juggler guesses and count, Oracle, Seamstress, Flowergirl,
  Town Crier, Sage and Sweetheart information, the Klutz loss and the Dreamer
  target rule.

## Impact

- Runtime: `src/core/engine/sv.ts`, `src/core/engine/night.ts`,
  `src/core/engine/day.ts`, `src/core/engine/commands.ts`,
  `src/core/model/{types,state}.ts`, `src/core/commands/contracts.ts`,
  `src/ui/screens/table/{cards,drafts}.tsx`, `js/locales/*.js`.
- Tests: `js/snv.test.mjs`.
- Docs: `docs/rules-matrix.md`, `docs/rules-sources.md`.
- Storage: two additive state fields (`juggler`, `lastDay`) with defaults, no
  schema bump and no migration; an older v4 save imports with both absent.
- No new dependency.

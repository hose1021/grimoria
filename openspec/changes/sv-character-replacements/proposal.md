# Proposal

Issue: #38
Part of #19.

## Why

Sects & Violets ships four characters that change who a player is: the Pit-Hag
changes one character, the Snake Charmer swaps with the Demon, the Barber swaps
two characters after its own death, and the Philosopher borrows another
character's ability. The engine still creates their night steps and notes but
applies no change: `sv.ts` only marks the Philosopher's use, and
`docs/rules-matrix.md` records all four rows as `host-choice`. A host who
resolves a swap by hand leaves the team, the current night's queue, the Evil
Twin reference, the Demon bluffs and the No Dashii poison stale, and a manual
correction cannot record that the change came from an ability.

## What Changes

- `replaceCharacter` in `src/core/engine/sv.ts` changes one player's character
  atomically: `roleId`, `shownRoleId`, `changedFrom`, the Evil Twin good-twin
  reference, the bluffs and the current night's queue, while the player's
  alignment stays the same.
- A character change removes the replaced player's unfinished step of the old
  character and inserts the new character's step at its official position when
  that wake is still ahead tonight. A wake whose slot has passed is not
  retroactively added.
- The Pit-Hag rejects a character already held by any player, applies a change
  to any target otherwise, and lets the normal win check resolve a game with no
  living Demon.
- The Snake Charmer requires a living target, swaps characters and alignments
  with the chosen Demon, poisons the new Snake Charmer permanently, and lets the
  new Demon wake in the Demon's slot.
- The Barber swaps two chosen characters after its death without changing
  alignments, allows the choosing Demon to swap itself, rejects another Demon
  and keeps the Evil Twin pair.
- The Philosopher stores the borrowed good character, wakes with that ability on
  the same and later nights, and makes the character's owner drunk while it is
  in play; the drunk follows the character and ends when the Philosopher dies or
  is impaired, and declining the step does not spend the ability.
- The dead-actor guard in `completeStep` lets the death-triggered roles
  (Ravenkeeper, Grandmother, Moonchild, Barber, Sweetheart, Sage) complete their
  step, and the same map drives `pruneDeadSteps`.
- An existing character change survives export and import.

Out of scope: madness, the Vigormortis, the Juggler number, the Dreamer/
Seamstress information and the Klutz choice. They stay `host-choice` or
`implemented-unverified` in the matrix.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `game/sects-and-violets`: adds character-replacement requirements for the
  Pit-Hag, Snake Charmer, Barber and Philosopher, plus the consistency
  guarantees (no duplicate character, no dangling reference, export/import).

## Impact

- Code: `src/core/engine/sv.ts`, `src/core/engine/night.ts`,
  `src/core/model/effect-graph.ts`, `src/ui/screens/table/cards.tsx`.
- Tests: `js/snv.test.mjs` gains eighteen replacement, rejection, win,
  philosopher and export/import cases.
- Docs: `docs/rules-matrix.md` moves the four role rows to `verified`.

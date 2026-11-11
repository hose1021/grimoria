# Design

## Decision: one character-change primitive

`replaceCharacter` owns every field that a character identity has: `roleId`,
`shownRoleId` and `changedFrom`, then repairs the references that point at a
character rather than a player.

- The alignment is pinned through `realTeamOf` before the change, so a saved
  `team: null` cannot flip when the character changes. The Pit-Hag changes the
  character, not the alignment (r2998).
- The Evil Twin pair is stored by player id (`setup.evilTwinGoodPlayerId` and
  `setup.evilTwinPlayerId`) and never follows a character, so the pair and its
  win stay with the same players.
- `state.bluffs` must list characters not in play; the created character is
  removed from it.
- `reconcileNoDashiiPoison` and `reconcilePhilosopherDrunk` run after every
  change, so the poisoned neighbours and the Philosopher's drunk follow the new
  characters.
- When the player stops being the Philosopher, the borrowed ability marker is
  deleted, so a later replacement cannot keep using it.
- Effects store player ids, so no effect reference dangles. The winner check
  runs through `finishStep` as for any night step.

## Decision: queue recalculation by official position

The queue is a list ordered by `order` (the official `nightsheet.json` index).
A change marks the changed player's unfinished steps as skipped and inserts the
new character's step only when its index is greater than the current step's
index. This models the official wake order: a character whose slot has already
passed does not act tonight, and a character that wakes later still does. The
Snake Charmer therefore lets the new Demon wake (the Demon slot is after the
Snake Charmer slot) while the new Snake Charmer does not wake again.

A swap changes both players, so both are requeued with the same current index.

## Decision: swap semantics

`swapCharacters` exchanges `roleId`, `shownRoleId` and `changedFrom` and leaves
`player.team` alone. The Snake Charmer passes `alignments: true`, which assigns
each player the other player's `realTeamOf`; the Barber does not, so both
alignments stay. This keeps the official distinction: the Snake Charmer swaps
characters and alignments (r2905), the Barber swaps characters only (r1757).

The Evil Twin pair is resolved to player ids at the deal
(`setup.evilTwinGoodPlayerId` and `setup.evilTwinPlayerId`), so a character
change never moves the pair or its win to another player. The win reads the good
twin's `realTeamOf`: executing the good-aligned twin wins for evil, and
executing the role's new holder does not.

The pair is only active while the `eviltwin` character is held by a living,
unimpaired player: `evilTwinPair` resolves the current holder, returns null when
the holder is dead, impaired or the character left play, and both the execution
win and the "good cannot win" block use that result. Imported saves that predate
the player ids are backfilled once from the roles in `importGame`, before any
character change can move them.

## Decision: Pit-Hag legality

The printed ability says "a character they become (if not in play)". The engine
rejects the whole command when any player already holds that character, and the
step's `roleChoices` exclude held characters so the UI offers only legal
options. The character must also belong to the active script.

## Decision: Philosopher ability and drunk

The borrowed ability is stored as `used.philosopherAbility`. The Philosopher
step is first in the Sects & Violets order, so a borrowed ability is always
inserted into the same night's queue unless the ability has no step for that
night. Later nights rebuild the queue from the same marker, and a borrowed
death-triggered ability is appended after the Philosopher's own death.

Completing the optional step without a character does not spend the ability;
choosing a character spends it, even while impaired (the ability then fails).

When the chosen character is in play, a permanent `drunk` effect targets its
owner. The effect is marked `philosopher: true`; the effect graph requires a
living source for it, so the owner is sober again when the Philosopher dies or
is impaired. `reconcilePhilosopherDrunk` recomputes the target after every
character change, so a character chosen while absent is drunk from the moment
it enters play. Choosing the Philosopher's own character targets the
Philosopher.

## Decision: Snake Charmer poison

The new Snake Charmer is poisoned from the moment of the swap with no expiry
(r2905), and the target must be alive ("choose an alive player"). A dead or
non-Demon target applies no swap and no poison. The effect source is the player
who used the ability (now the Demon); the standard source-loss rules apply.

## Decision: dead-actor guard

`completeStep` skipped every dead actor except the Ravenkeeper, which made the
Barber, Sweetheart and Sage steps unusable even though `stepAllowed` and
`pruneDeadSteps` create and keep them. One `DEATH_TRIGGERED` map now drives
both the `completeStep` guard and `pruneDeadSteps`, and lists every role that
wakes on its own death: Ravenkeeper, Grandmother, Moonchild, Barber, Sweetheart
and Sage.

## Rejected alternatives

- A new command type per role: the night step already carries the targets and
  the role choice through `completeNightStep`, so no payload or command
  registry change is needed.
- Editing `state.setup.roles`: the bag is a setup record; a mid-game change is
  carried by the players, and `validateState` checks player roles against the
  script, not the bag.
- Rewriting the Evil Twin reference during a swap: the reference is a role id
  and the pair keeps one holder of each role, so a rewrite would point the
  reference at the evil twin.

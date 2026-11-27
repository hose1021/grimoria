# Design

## What the Snake Charmer's branch did

`completeSvStep` resolved the Snake Charmer in place:

1. A dead chosen player was refused with `error.55` ("choose an alive
   player", r2905).
2. When the chosen player held a Demon character and the Snake Charmer was
   sober and healthy, `swapCharacters` swapped the two characters and
   alignments, requeued tonight's steps and reconciled the No Dashii's, the
   Vigormortis's and the Philosopher's effects. Then a permanent poison from
   the acting seat on the old Demon was pushed once, with the id
   `eff-snakecharmer-<seat>-<player>`, and the note
   `note.characterSwapPoisoned` was written.
3. Otherwise nothing was written, and the step got the shared note.

The order matters: the reconciliation inside the swap pushes the new No
Dashii's poison before the Snake Charmer's poison is pushed.

## The swap decision

ADR 0002 lists `replace`, `swap` and `no-effect` as the transformation
decisions. `swap` names the player the acting seat swaps with and two facts
of the rule: whether the alignments are exchanged, and whether the player is
then poisoned for good by the acting ability. The Snake Charmer says yes to
both: "a chosen Demon swaps characters & alignments with you & is then
poisoned". The engine names the acting seat, mints the poison's id from the
ability, the seat and the player, and writes the poison once, after the
swap. A role cannot name the id, the source or the seat the swap starts
from.

The Barber's swap keeps the alignments and poisons nobody; it moves with
its wake. Until then the engine's handling of a swap without alignments or
without the poison is not exercised: it passes `alignments` to the shared
swap and writes the Barber's swap note instead of the poison.

`no-effect` gains the reason `not-demon`. The engine writes nothing for any
reason of the Snake Charmer, as the branch did: a drunk or poisoned Snake
Charmer gets the shared note, not the failure note the Pit-Hag gets.

## The facts

`TransformationContext` is unchanged. For a swap, `newRoleId` is the
character the acting seat would take, the chosen player's. The Snake
Charmer reads the chosen player's character through `actualRoleOf` and
its health through `impaired`. A chosen player without a character changes
nothing, as before.

The Pit-Hag's facts and the Snake Charmer's come from one builder in
`sv.ts`; "in play" still counts a character a Philosopher borrowed.

## A Philosopher with the Snake Charmer's ability

The borrowed step names the Snake Charmer, so the Snake Charmer's module
decides, with the Philosopher as the acting seat. The swap gives the
Philosopher the Demon and the Demon the Philosopher, poisoned ("the Demon
becomes a poisoned Philosopher", r2905), as before.

## The timing

The Snake Charmer is on both sheets: `any`. The Pit-Hag is on the other
nights only: `other`; its legacy step on the first night was never built.
Neither owns a night-step resolver, so `completeSvStep` keeps both
branches, which now take their decision from the transformation capability.

## What does not move

- `sv.ts` names the Snake Charmer in its console note, in the branch that
  routes its step and in the cause of its facts; the Pit-Hag in its
  character list, its console note, its branch and its cause.
- The outcome lets the host mark deaths on any Pit-Hag step, because the
  step carries `canKill`, also when no Demon was made. The pinned text
  allows arbitrary deaths "if a Demon is created". This change keeps the
  behavior; it is a separate rules question.

## The ledger

The Snake Charmer's row declares `capability:night-step` and
`capability:transformation` and moves to "capability + engine reference"
with `sv.ts`×4; the Pit-Hag's row declares `capability:night-step` in place
of `nightStep`. The counts become 35 and 31.

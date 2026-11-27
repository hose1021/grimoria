# Design

## What the branch did

`completeSvStep` resolved the Cerenovus in place, after the seat's record
was created:

1. When the step named a player and a character that is not a Townsfolk or
   an Outsider of the script, it refused the completion with `error.2`.
2. When the step named a player and a character and the Cerenovus was sober
   and healthy, it pushed a madness token and wrote the note
   `note.madness`. The token's keys, in order: `id`
   (`eff-madness-cerenovus-<seat>-<player>-<night>`), `kind` (`madness`),
   `madness` (`cerenovus`), `roleId`, `sourceId`, `targetId`, `start` (the
   current moment), `expires` (the dawn of the next day) and `active`.
3. Otherwise it wrote nothing. A drunk or poisoned Cerenovus got no failure
   note; the step got the shared "step finished" note from `finishStep`.

It drew nothing from the command ports. Before the completion, the step's
console note was stored as its `given` answer, as for every Sects & Violets
step with an answer.

## The timing

"Each night, wake the Cerenovus" (r3048), and the official sheet lists the
Cerenovus on the first night and on the others. The arm is `any`, with the
step the legacy field declared.

## The madness intent

A dated `timed-effect` is not the token: its id is minted from the command
ports, it has no character, and a failed use keeps it as an inactive record.
The token's id is read by the day's review and stored in saved games and
journals, so a new id would change them. The `madness` intent names the
player, the character and the first moment the madness no longer applies.
The engine writes the rest: the id from the acting ability's module, the
acting seat, the player and the night; the owner (`madness`) from the
module; the source and the start. A role cannot name any of them. The engine
stores a copy of `expires`.

On the `suppressed` path the engine writes nothing. A failed ability makes
nobody mad, and the branch kept no record of it. The Cerenovus returns
`no-effect` when impaired, so the path is not reached today; the rule keeps
a later role from leaving a token behind a failed ability.

## The command check

"They point at any player and at any Townsfolk or Outsider icon" (r3048).
The step offers only those characters, and the completion refuses another
one with `error.2`. A resolver returns a decision and cannot refuse the
command, so the check stays in `completeSvStep`, before the step is handed
to the coordinator, with the same condition: a player and a character are
named and the character is not good. Through `applyCommand` a refused
completion leaves the state unchanged.

## A Cerenovus the Vigormortis killed

"Minions you kill keep their ability" (Vigormortis r3015): the queue
builder still wakes such a Cerenovus through `stillWakes`, and the step
completion still lets a dead actor complete while the Vigormortis keeps the
ability. The resolver reads only `impaired`, which the effect graph answers
for the dead Minion as before. No retained-ability fact is added.

## What does not move

- `sv.ts` names the Cerenovus where the step builder lists the good
  characters, where the console note is built, and in the command check.
- `effects.ts` names it where the token holds after its source dies or is
  impaired, and `day.ts` where a token told tonight cannot be punished
  tonight.

## The ledger

The row declares `capability:night-step` and moves from "engine branch" to
"capability + engine reference", with `effects.ts`×1, `day.ts`×1 and
`sv.ts`×3. The counts become 27 and 39.

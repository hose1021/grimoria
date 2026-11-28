# Design

## Log entry

`LogEntry` and `LogInput` gain two optional fields: `actorId` and `targetIds`.
`finishStep` and `finishAttackStep` fill them from the completed step after the
ability resolves, so a suppressed step still records who chose whom. They are
optional, so an older save keeps its log and an older client ignores them. The
journal, the command set and the ruleset version do not change.

The existing note stays. The structured fields are the complete record; the note
is the human explanation.

## Courtier

The Courtier picks a character. The branch in `completeBmrStep` sets a concrete
note with the character and the players it made drunk, or says that no player
of that character is in play. The chosen character is already in
`options.roleId`; the players are the ones the effect targets. The note uses a
locale key with the character id, so the console names it in the current
language.

## Chronicle rendering

`GameLog` builds one extra segment per line when the entry has an actor or
targets: `P1 → P2, P3`, or `Выбор ведущего: P2` when only a target exists. Seat
names come from the saved players; a player who no longer exists is skipped.
The segment is rendered in the side panel and the game-over chronicle, so one
mapping keeps both surfaces identical.

## Tests

The exact log expectations in `bmr.test.ts`, `engine.test.ts` and `snv.test.ts`
gain the two fields on role steps. The Courtier test asserts the note and the
drunk players. The browser case asserts the chronicle line.

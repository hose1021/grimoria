# Design

## Context

`Nomination` stores the voter ids and the dead voters. `state.lastDay` keeps the
nominations for the next night's questions. `state.juggler` stores the guess
day and the guesses.

`svInfoForStep` read the current `player.roleId` for both answers. That is wrong
after any character change between the event and the question.

## Decisions

### Snapshot on the event, not on the question

- `recordVotes` computes `demonVoters` from the voters' current roles. Votes are
  recorded before the night, so this is the vote-time roster. Dead Demons with a
  vote token are included; pinned Flowergirl counts any Demon, "even dead
  Demons".
- `nominate` computes `minionNomination` from the nominator's team. The Town
  Crier has no pinned character-change sentence, but the same snapshot is the
  honest event fact.
- `reportJugglerGuesses` computes `correct` when the guesses are recorded. The
  day has no character changes between guesses and night.

### Read the snapshot, keep a legacy fallback

`svInfoForStep` uses the stored value when present. A save from before this
change has no field; the old computation remains the fallback, so the same
saved game still loads and answers.

## Risks / Trade-offs

- A host who corrects a character after the vote does not change the Flowergirl
  answer. That is the pinned behavior: the answer records the event.
- The optional fields are additive; `validateState` ignores unknown fields and
  the import/export envelope keeps them.

## Test plan

- `snv.test.ts`: a Demon votes, the roles swap, the Flowergirl still answers
  true; the mirror seat that becomes the Demon did not vote, answer false.
- `snv.test.ts`: a correct guess is marked, the guessed seat changes character,
  the Juggler still answers 1.
- Full `npm test`, `npm run typecheck`, acceptance, OpenSpec checks.

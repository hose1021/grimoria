# Proposal

Issue: #219

## Why

Two Sects & Violets information abilities depend on facts as they stood during
the day, but the engine recomputed them at wake time:

- Flowergirl r2907: "If the Demon changes players after the original Demon
  voted but before the Flowergirl wakes to learn their information, the
  Flowergirl detects the original Demon."
- Juggler r2401: "For each correct guess, mark the Juggler with a CORRECT
  reminder… Show them fingers… equaling the number of CORRECT reminders."

The current code reads each player's role at the moment of the question. A
Snake Charmer, Pit-Hag or Fang Gu change between the vote or guess and the wake
therefore flips the answer. The engine reported the post-change roster, not the
event.

## What Changes

- `recordVotes` stores `demonVoters` on the nomination: the voters who were
  Demons when the votes were recorded.
- `nominate` stores `minionNomination`; the Town Crier reads it with the same
  fallback.
- `reportJugglerGuesses` stores the CORRECT count on `state.juggler` at the
  moment the guesses are recorded.
- The Flowergirl and Juggler read the stored facts; a legacy save without them
  keeps the previous computed behavior.

## Out of Scope

- The character-change mechanics themselves.
- A new command, journal envelope or storage version. The new fields are
  optional and live inside `pg.game.v4`.
- Reevaluating a nomination after a role change by any other rule.

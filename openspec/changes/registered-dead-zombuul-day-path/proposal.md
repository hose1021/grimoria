# Proposal

Issue: #313

## Why

Zombuul r3022, Summary: "The 1st time you die, you live but register as dead."
The same page says the seemingly dead Zombuul "counts as a dead player in almost
every way. … They cannot nominate, … The next time they vote, they lose their
vote token … and so on."

The engine's day path tested `player.alive`, which stays true after the Zombuul's
first death. A registered-dead Zombuul could therefore nominate, cast an
unlimited living vote, and raise the execution threshold that the table has to
meet. The Tea Lady and the Chambermaid already use `registersAlive`; the day path
did not.

## What Changes

- `nominate` rejects a nominator who does not register as alive (`error.11`).
- `recordVotes` classifies a registered-dead voter as a dead voter: the first
  vote counts and spends the vote token, a later vote is only a warning.
- The execution threshold and the table projection count registered-living
  players only.
- A `BMR-ZOMBUUL-02` engine row and its behavioural test.

## Out of Scope

- The nomination picker in the table screen; it is the same issue's UI follow-up.
- Abilities that already use `registersAlive` (Tea Lady, Chambermaid, death and
  victory counts).

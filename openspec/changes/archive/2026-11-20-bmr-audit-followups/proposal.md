# Proposal

Issue: #218

## Why

Three Bad Moon Rising audit findings remain after the first correction set:

- Chambermaid r2966: do not wake the Chambermaid when there are not two players
  alive to be chosen "due to the Mastermind, Zombuul, etc.". The engine counted
  actual living players, but completion rejects a registered-dead Zombuul, so
  the step could offer an illegal choice.
- Minstrel r2600: "all other players (except Travellers) are drunk until dusk
  tomorrow." The engine excluded dead players, so a player resurrected that
  night was not drunk.
- Moonchild r1783, Examples 3: a regurgitated Moonchild chooses again on the
  next death. Resurrection cleared other once-per-game flags but not the
  Moonchild's.

## What Changes

- The Chambermaid wake requires two other `registersAlive` players.
- The Minstrel drunk affects every other player, including the executed Minion
  and already-dead players.
- Resurrection clears the Moonchild choice, its alignment and the resolved flag.
- Three RED → GREEN tests and their evidence rows.

## Out of Scope

- Travellers, who cannot enter a supported script.
- The other audit findings already reported but not fixed.

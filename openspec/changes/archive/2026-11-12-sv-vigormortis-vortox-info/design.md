# Design

## Decision: computed information is the engine's, false information is the host's

Every Sects & Violets information role that the engine can answer is computed
from the state: the Oracle counts dead evil players, the Seamstress compares
alignments, the Flowergirl looks for a Demon vote in the ended day, the Town
Crier looks for a Minion nomination, the Juggler compares recorded guesses with
the players' characters, and the Clockmaker measures the seat distance.

`svInfoForStep` returns the computed value with `needsChoice: false` only when
it is trustworthy. It sets `needsChoice: true` when the actor is impaired or a
living, unimpaired Vortox is in play, and offers the legal answer set
(`options`) for a number or yes/no step. `completeStep` then requires a
`given` answer, exactly like the Bad Moon Rising and Trouble Brewing information
roles, so the host must state the false information and the UI cannot show the
computed truth as final. This keeps the printed rule "Townsfolk abilities yield
false info" explicit instead of silently correct.

The Vortox test reads the character, not `state.scriptId`: a living
`vortox` holder that is not impaired. A drunk or poisoned Vortox gives true
information again.

## Decision: the Juggler guesses are data, the count is derived

The Juggler's ability is "On your 1st day, publicly guess up to 5 players'
characters. That night, you learn how many you got correct." The guesses are
public table information, so the engine stores them in `state.juggler`
(`{ day, guesses }`, guesses keyed by player id) through a new `jugglerGuess`
command:

- the day must be the first day and the Juggler must be alive;
- the target must be a player and the character must belong to the script;
- at most five distinct targets; repeating a target replaces that guess;
- only day 1 records guesses: "on your 1st day".

The Juggler's night step exists only when day-one guesses were recorded and the
once-per-game step is unused. Its answer is the count of guesses whose
character equals the target's current `roleId`; there is no constant. The host
can still override it when the Juggler is impaired or a Vortox is in play.

## Decision: Vigormortis keeps the Minion's ability, not the Minion

"Minions you kill keep their ability & poison 1 Townsfolk neighbor." A killed
Minion is dead, so nothing makes it wake again as a living actor. Instead:

- `minionRetainsAbility` is true for a dead Minion whose death was caused by
  the Vigormortis (`death.ability === "vigormortis"`, `death.demon`) while a
  living, unimpaired Vigormortis exists. The step builder, `pruneDeadSteps` and
  the `completeStep` dead-actor guard all consult it, so a dead Cerenovus,
  Pit-Hag, Witch or Evil Twin keeps acting.
- The retained minion wakes and acts exactly as its character does; its
  existing once-per-game and impaired rules still apply.
- If the Vigormortis dies or is impaired, the retention stops and the step is
  pruned like any other dead actor's step.

## Decision: one poisoned Townsfolk neighbour

The printed ability poisons "1 Townsfolk neighbor" of the killed Minion. r3015
states that the Storyteller chooses which of the Minion's Townsfolk neighbours
is poisoned, so the engine:

- collects the nearest Townsfolk on each side of the killed Minion's seat as
  the two legal choices and defaults to the clockwise nearest;
- accepts a host override, `poisonId`, naming the other legal Townsfolk
  neighbour, so the Storyteller makes the real table choice;
- marks the effect `vigormortis: true` and `permanent: true`, because its source
  (the dead Minion) is not alive, and `reconcileVigormortisPoison` deactivates
  it when no living, unimpaired Vigormortis remains or when the dead source
  stops being a Minion.

The poison effect is not a No Dashii poison, so `reconcileNoDashiiPoison`
ignores it, and it is not a Snake Charmer poison.

## Decision: the Klutz loss runs in the engine's win check

The Klutz's step is appended after the Klutz dies (the existing
`appendSvConditionalSteps` path) and marked `DEATH_TRIGGERED` so a dead actor
can complete it. Completing it with one living target tests the target's
alignment, as the printed "if they are evil, your team loses" says:

- an evil target makes the Klutz's team lose, so the opposing team wins;
- a non-evil target means no loss.

This also covers an evil-aligned Klutz (for example after a Pit-Hag change):
choosing an evil player then makes evil lose and good win. The winner is set
through `setWinner` inside `completeSvStep` (reason `klutz`), so the result does
not depend on the UI, and `checkWin` already returns the existing winner.
Choosing a dead player is a typed rejection and leaves the state unchanged.

## Decision: the Dreamer and Seamstress target rules are enforced in the engine

The Dreamer chooses "a player (not yourself or Travellers)"; the Seamstress
chooses "2 players (not yourself)". The engine already rejects a self target
for both (`completeStep` `error.40`); the Seamstress also needs two distinct
players, which the S&V branch did not check because the generic two-target rule
skips S&V. `completeSvStep` now rejects a missing, repeated or self target
before it marks the once-per-game ability used.

## Rejected alternatives

- Auto-generating false information: the Storyteller chooses the lie, and a
  generated answer could accidentally be true. A `needsChoice` answer keeps the
  host in control.
- Poisoning both Townsfolk neighbours: the ability says one.
- Making the Juggler count read `state.day.nominations`: guesses are characters,
  not nominations, and the day is already closed when the Juggler wakes.
- Computing the Mathematician count: "worked abnormally" is a Storyteller
  judgement about which abilities were affected, so that row stays an explicit
  `host-choice` and the step keeps its note.

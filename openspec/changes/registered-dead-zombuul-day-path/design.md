# Design

## Decision

The day path uses the existing `registersAlive(player)` predicate
(`alive && !registeredDead`) instead of `player.alive`. One predicate already
feeds the Tea Lady, the Chambermaid, the death count and the victory count, so
the day path joins the single source of truth rather than adding a second rule.

## Threshold

`executionThreshold` takes a count. The day path passed
`livingPlayers(state).length` at four sites: the two nomination creators, the
Witch-death recomputation and the recorded-votes recomputation. Each now passes
the registered-living count through one local helper. A registered-dead Zombuul
is dead for the threshold, as it is for every other count.

The table projection reported `living` and `threshold` from the same actual
count; it now uses the registered-living count so the screen and the engine
agree.

## Risk

The predicate is broader than the Zombuul: any player marked `registeredDead`
(manual correction included) now counts as dead for nomination, voting and the
threshold. That is the official meaning of the flag: it is how the table sees
the player. No existing test encoded the previous behaviour; the full suite
passes.

## Verification

The asserting test builds a five-player Bad Moon Rising day, marks the Zombuul
registered dead, and asserts the rejection, the spent token, the threshold of
two and the uncounted second vote. It fails before the change and passes after.

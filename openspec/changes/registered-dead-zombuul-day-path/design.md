# Design

## Decision

The day path uses the existing `registersAlive(player)` predicate
(`alive && !registeredDead`) instead of `player.alive`. One predicate already
feeds the Tea Lady, the Chambermaid, the death count and the victory count, so
the day path joins the single source of truth rather than adding a second rule.

## Threshold

`executionThreshold` keeps `livingPlayers(state).length` at all four day sites,
and the table projection keeps the same count. Zombuul r3022 says the
seemingly dead Zombuul "counts as a dead player in almost every way"; the
pinned page does not state whether the execution threshold is inside or outside
that "almost". The threshold therefore stays unchanged in this change, and #313
records the open question with its pinned source. Changing it needs an owner
decision first.

## Risk

The predicate is broader than the Zombuul: any player marked `registeredDead`
(manual correction included) now counts as dead for nomination and voting. That
is the official meaning of the flag: it is how the table sees the player. No
existing test encoded the previous behaviour; the full suite passes.

## Verification

The asserting test builds a five-player Bad Moon Rising day, marks the Zombuul
registered dead, and asserts the rejection, the counted first vote, the spent
token, the unchanged threshold of three and the uncounted second vote. It fails
before the change and passes after.

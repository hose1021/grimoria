# Design

## The rule

- Goon r2977, "How to Run": "The Goon still changes alignment, and makes the
  player drunk, if the player choosing the Goon was already drunk or
  poisoned."
- Pukka r3074, "How to Run": "If the Pukka was sober when they chose a player
  the previous night, but is drunk at night, that player does not die. But
  when the Pukka sobers up, the poison resumes and kills the player at night."
- SYS-EFFECTS-04, owner decision on PR #24: a same-night or otherwise
  unresolvable cycle is rejected with `CYCLIC_EFFECT_DEPENDENCY`.

Rules check: compliant. A Pukka poisoned by its own poison is a chooser who
"was already drunk or poisoned", so it is drunk until dusk and the Goon takes
its alignment. While it is drunk its own poison does nothing, and the poison
resumes when it sobers up. That is a resolvable state, not a cycle, so
SYS-EFFECTS-04 does not apply to it.

## Where the defect was

`topological` in `src/core/model/effect-graph.ts` orders the active poison and
drunk effects before `resolveAt` decides which of them hold. Each effect
waited for every effect whose target is its source, because an impaired
source loses its effect.

The Pukka's poison on itself (source 1, target 1) and the Goon's drunk on the
Pukka (source 1, target 1) each target the other's source, so each waited for
the other. `orderCascade` reported a cycle, `effectGraph` returned
`CYCLIC_EFFECT_DEPENDENCY`, and the final check of `completeNightStep` refused
the command.

The wait was never needed for the Goon's drunk. It is created with
`permanent: true` (`bmr.ts`), and `resolveAt` keeps a permanent effect active
whatever its source is. Its place in the order changes nothing about it.

## Decisions

### A permanent effect waits for nothing

`dependsOnSource` decides whether an effect waits for the effects on its
source. It is false for a permanent effect, so `topological` gives it no
incoming edge. Its outgoing edges stay: an effect whose source is the
permanent effect's target still waits for it.

Why the result of an acyclic graph does not change:

- A permanent effect holds whenever it is started, not expired, active and
  valid. None of that depends on the order, so it holds in either place.
- Every other effect still waits for every effect on its source, so it is
  decided after all of them, as before.
- The edges are a subset of the old ones, so an acyclic graph stays acyclic
  and nothing else in it moves.

A permanent effect can now be reached before or after a poison on its source.
`resolveAt` already keeps a permanent effect active when its source is
impaired, so both orders give the same result. A new test covers both orders,
because no test did before: the mutation that drops that clause survived on
main.

### The Vigormortis poison still waits

The Vigormortis poison is created with `permanent: true` so that it outlives
the dead Minion that is its source. It does not ignore that Minion's
impairment: `reconcileVigormortisPoison` turns it off while the Minion is
drunk or poisoned and back on when the Minion is sober (SNV-VIGORMORTIS-02).
That makes it depend on its source, outside the graph.

If it waited for nothing, a cycle through the Minion would resolve with the
poison assumed on, and the reconcile would then read the Minion as sober and
keep it on. That can be the wrong one of two consistent answers. For
example, if the Minion was drunk before the Vigormortis killed it, the poison
should be off. So `dependsOnSource` stays true for an effect flagged
`vigormortis`, and such a cycle is rejected exactly as before.

The Snake Charmer's poison is not reconciled. It holds whatever its source
is, so it waits for nothing like the Goon's drunk.

### No ruleset version

A ruleset version is needed when a recorded command would behave differently.
A command the engine allowed ended on an acyclic graph, because the final
check refuses a cyclic one, and this change resolves acyclic graphs the same
way. The seeded driver also counted the cycles the graph met inside every
command: in 600 games no allowed command met one. Refused commands are not
recorded. So every journal replays as written.

## Proof

- **RED first.** On main `d383d53` the four new tests that need the change
  fail with `CYCLIC_EFFECT_DEPENDENCY`. Two more tests guard the change and
  pass on main. One keeps the Vigormortis cycle rejected. The other checks a
  permanent effect in both visiting orders. The focused browser check fails
  on main at "the preview of the choice names no rejection".
- **Seeded driver, 200 games per edition.** Trouble Brewing and Sects &
  Violets, the latter with the Snake Charmer and the Vigormortis in every
  game, are identical on main and on this change. In Bad Moon Rising, with
  the Pukka and the Goon in every game, 193 games are identical and 7 differ.
  Those 7 are exactly the games in which main refused a choice as a cycle,
  and each first differs on the night of that refusal. The 600 games saved by
  main replay on this change exactly as on main.
- **Mutations.** The mutations in `tasks.md` are each killed by the unit
  tests.
- **Screen.** The focused check `pukka-goon` in `scripts/browser-check.ts`
  plays the choice at 390 px.

## Limitations

- A cycle through a Vigormortis poison is still refused, as on main. The
  engine does not yet decide it by creation order, which would need the
  reconcile to move into the graph.
- The driver met the defect only through the Pukka. Any other chooser that an
  effect of its own impairs is covered by the same graph rule and its unit
  tests, not by the driver.

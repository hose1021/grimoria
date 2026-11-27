# A Pukka poisoned by its own poison can choose a sober Goon

Issue: #200

## Why

Goon r2977, "How to Run": "The Goon still changes alignment, and makes the
player drunk, if the player choosing the Goon was already drunk or poisoned."
The Bad Moon Rising spec already holds this as the scenario "Already impaired
chooser".

The engine refused one such chooser. When the Pukka had poisoned itself on an
earlier night and then chose a sober, healthy Goon, the command was rejected
with `CYCLIC_EFFECT_DEPENDENCY`, so the host could not record the choice and
the night could not go on through that step. Preview showed the rejection on
the table.

The two effects that clash are both the Pukka's own: its poison on itself and
the Goon's drunk on itself. The effect graph made every effect wait for the
effects on its source, so each of the two waited for the other. The Goon's
drunk is permanent: it keeps its printed lifetime whatever happens to its
source, so the wait was never needed. It was found while the Bad Moon Rising
night steps were surveyed for the capability migration and kept for its own
fix; the owner asked for the fix.

## What changes

- In the effect graph a permanent effect (the Goon's drunk, the Snake
  Charmer's poison) waits for no effect on its source. Effects on its target
  still wait for it.
- The Vigormortis poison keeps waiting for its dead Minion: it is permanent
  only in that it outlives the Minion, and it ends while that Minion is drunk
  or poisoned (SNV-VIGORMORTIS-02).

## What stays

- **Every graph the engine resolved before.** Removing waits from effects
  whose result does not depend on their source leaves the active set and the
  impaired players of an acyclic graph unchanged.
- **Every other cycle.** A cycle in which each effect depends on its source,
  for example a same-night poison and drunk of a player on themself, or a
  cycle through a Vigormortis poison, is still rejected with
  `CYCLIC_EFFECT_DEPENDENCY` (SYS-EFFECTS-04).
- **Recorded commands.** No command that the engine allowed passed through a
  cycle, so every journal replays as it was written and the ruleset version
  stays `tb-bmr-snv-2026-11-17.1`.
- **The Goon rule.** The trigger, the drunk until dusk, the alignment change
  and the printed exceptions are unchanged.

## Impact

A Pukka, or any chooser whose own effect impairs themself, can now choose a
sober Goon; before, that choice was refused. No storage format, command
payload, schema or ruleset version changes. A hand-made save that held such a
cycle now imports instead of being refused.

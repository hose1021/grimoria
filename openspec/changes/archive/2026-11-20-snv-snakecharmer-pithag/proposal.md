# Sects & Violets night steps as capabilities: the Snake Charmer and the Pit-Hag

Issue: #200

## Why

Slice 4 of ADR 0002 continues with the two Sects & Violets roles whose
step changes a character: the Snake Charmer and the Pit-Hag. Both wake
without reading the game, and both steps are still legacy fields. The
Pit-Hag already decides its change on a `transformation` capability that
`sv.ts` applies. The Snake Charmer's rule is still a branch of
`completeSvStep`, because the contract has no decision for a swap; ADR 0002
lists `swap` among the transformation decisions to add.

## What changes

- The Snake Charmer declares its step on a `night-step` capability for every
  night ("Each night, wake the Snake Charmer", r2905), and the Pit-Hag for
  every night except the first ("Each night except the first, wake the
  Pit-Hag", r2998), with the shapes the legacy fields declared and no
  night-step resolver.
- The transformation contract gains a `swap` decision: the acting seat swaps
  characters with the named player, `alignments` says whether they also
  exchange alignments, and `poisoned` whether the player is then poisoned
  for good by the acting ability. The `no-effect` decision gains the reason
  `not-demon`.
- The Snake Charmer declares a `transformation` capability: a healthy Snake
  Charmer who chooses the Demon returns a swap with alignments and the
  poison; a player who is not the Demon, or a drunk or poisoned Snake
  Charmer, returns `no-effect`.
- `sv.ts` applies the swap through the shared swap, then writes the
  permanent poison with the id the branch wrote. One builder gives the
  Pit-Hag and the Snake Charmer their transformation facts.

## What stays

- **The two rules.** The swap, the alignments, the poison with its id and
  its place after the No Dashii's and the Vigormortis's reconciled poison,
  the notes, the requeued steps and the draws are the same. A Snake Charmer
  who changes nothing still gets the shared note.
- **The command checks.** A dead player is still refused for the Snake
  Charmer (`error.55`), and a character outside the script for the Pit-Hag
  (`error.2`).
- **The Pit-Hag.** Its change, its no-op for a character in play, its
  failure note while impaired, and the Demon it makes, which does not wake
  while the host marks the night's deaths on its step.
- **The Barber.** Its swap stays a branch: its step is woken by its own
  death and chosen by the Demon, and waits for a contract for who wakes.

## Impact

Behavior is unchanged. The queue of every night, the record of each step,
the characters and alignments, the effects with their ids, flags and order,
the deaths, the log lines, the command results and the order of draws from
the command ports stay the same, so saved games and journals replay as
before. No storage, command payload, schema, ruleset version or pin
changes.

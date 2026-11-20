# Bad Moon Rising night steps as capabilities: the Tinker, the Po and the Shabaloth

Issue: #200

## Why

Slice 3 of ADR 0002 moves the Bad Moon Rising night steps to the
`night-step` capability. The Tinker, the Po and the Shabaloth are the last
Bad Moon Rising roles whose wake reads no game state and that still resolve
in a branch of `completeBmrStep`. Their deaths are marked by the host on the
outcome of the step; the completion only keeps what the next night reads.
The Po's branch records whether the Po chose no one, the Shabaloth's branch
records its two players with last night's, and the Tinker's branch does
nothing. No intent can write either record.

## What changes

- The three modules declare their step and their resolver on a
  `night-step` capability for the nights after the first ("Each night
  except the first", Po r3104 and Shabaloth r1790; the Tinker is on the
  order of the other nights only).
- A new `record-no-one` intent writes whether the acting seat chose no one.
  The step builder reads it for the size of the Po's next step. The Po
  returns it whether or not it is drunk or poisoned: "If the Po was drunk
  or poisoned when they chose nobody last night, they still choose three
  players tonight" (Po r3104).
- A new `record-choices` intent writes the players the acting seat chose
  tonight and keeps the record it replaces as last night's, which the
  outcome reads for "a dead player you chose last night" (Shabaloth
  r1790).
- The Tinker's resolver returns `no-effect`: "At any time, you may decide
  that the Tinker dies" (Tinker r1782) is the host's mark on the outcome.
- The three branches leave `completeBmrStep`.

## What stays

- **The three rules.** The removed branches and the three resolvers write
  the same records in the same key order, the same step notes and the same
  log lines, and draw nothing.
- **The outcome.** The deaths marked by the host, the checks on them and the
  Shabaloth's regurgitation stay in `recordBmrOutcome`, which still names
  the Tinker and the Shabaloth.
- **The step builder.** The size of the Po's step after a night with no
  choice, and the Lunatic who was shown the Po, stay in `bmr.ts`.
- **The day.** The Tinker's death during the day stays the `tinkerDeath`
  command in `day.ts` (slice 8 of ADR 0002).
- **The Goon.** Its trigger in `bmr.ts` still runs before the step resolves.

## Impact

Behavior is unchanged. The queue of every night, the record of each step,
the effects with their ids and flags, the Po's and the Shabaloth's records,
the deaths, the log lines, the command results and the order of draws from
the command ports stay the same, so saved games and journals replay as
before. No storage, command payload, schema, ruleset version or pin
changes.

With this change, the Bad Moon Rising roles left with a legacy step are
those whose wake is read from the game: nine roles through `actor` hooks,
and the Grandmother, whose later step is added by her grandchild's death.
They keep their legacy step, and any branch, until a contract for who wakes
exists; a wake caused by a death is slice 6 of ADR 0002.

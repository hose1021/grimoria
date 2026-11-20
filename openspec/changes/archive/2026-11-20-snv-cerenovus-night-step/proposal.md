# Sects & Violets night steps as capabilities: the Cerenovus

Issue: #200

## Why

Slice 4 of ADR 0002 continues with the Cerenovus, the one Sects & Violets
role whose wake reads no game state and whose completion writes an effect:
the madness token that the day's review reads. The token was written by a
branch of `completeSvStep`, and no intent can write it.

## What changes

- The Cerenovus declares its step and its resolver on a `night-step`
  capability for every night ("Each night, wake the Cerenovus", r3048).
- A new `madness` intent names the player, the character and when the
  madness ends. The engine writes the token under the acting ability, with
  the id the branch wrote (the ability, the acting seat, the player and the
  night), and writes nothing on the `suppressed` path.
- A healthy Cerenovus that names a player and a character returns the
  intent, ending at the next dawn ("During the next day or night"), with the
  note the branch wrote. A choice without a character, or a drunk or
  poisoned Cerenovus, returns `no-effect`.
- The good-character check stays a command check in `completeSvStep`,
  before the step resolves: a resolver cannot refuse a command.
- The Cerenovus branch leaves `completeSvStep`.

## What stays

- **The rule.** The token, its id, start and expiry, the note, the log line
  and the draws from the command ports are the same, and a drunk or
  poisoned Cerenovus still gets the shared note, not a failure note.
- **The review.** The madness penalty in `day.ts`, which refuses to punish
  a token on the night it was told, and `effects.ts`, which keeps the token
  after its source dies, still read the token by its ability.
- **The step builder.** The list of good characters on the step and the
  console note stay in `sv.ts`.
- **A Cerenovus the Vigormortis killed.** It still wakes through the queue
  builder and still makes a player mad.

## Impact

Behavior is unchanged. The queue of every night, the record of each step,
the effects with their ids and flags, the deaths, the log lines, the
command results and the order of draws from the command ports stay the
same, so saved games and journals replay as before. No storage, command
payload, schema, ruleset version or pin changes.

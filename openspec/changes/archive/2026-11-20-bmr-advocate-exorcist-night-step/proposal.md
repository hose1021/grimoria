# Bad Moon Rising night steps as capabilities: the Devil's Advocate and the Exorcist

Issue: #200

## Why

Slice 3 of ADR 0002 moves the Bad Moon Rising night steps to the
`night-step` capability. The Devil's Advocate and the Exorcist both choose a
player "different to last night", and both still resolve in two branches of
`completeBmrStep`. The Devil's Advocate's branch records the choice, ends
last night's protection, stops on an impaired owner and writes the new
protection by hand. The Exorcist's branch records the choice, stops on an
impaired owner and, when the Demon is chosen, rewrites the Demon's step in
tonight's queue. Neither can be written with the contract as it is: no
intent records the choice whether or not the ability works, the dated
effects have no kind for the protection from execution, and no intent keeps
a Demon from waking.

## What changes

- The Devil's Advocate's module declares its step and its resolver on two
  `night-step` capabilities, one for the first night and one for the other
  nights, because the two nights show the host a different note ("Each
  night", Devil's Advocate r2594). Each use ends the protection it gave the
  night before.
- The Exorcist's module declares its step and its resolver on a
  `night-step` capability for the nights after the first ("Each night
  except the first, wake the Exorcist", Exorcist r2973).
- The `timed-effect` intent gains `survives-execution`. The engine stores it
  as the protection the execution check already reads for the Devil's
  Advocate, with the day it covers.
- A new `record-choice` intent writes the choice the step builder reads for
  "different to last night". It is written on the `suppressed` path too.
- A new `block-demon` intent keeps the chosen Demon from waking. The engine
  finds the Demon's step in tonight's queue; the role names the seat and
  writes the note and the log line. The Shabaloth's regurgitation and the
  Pukka's waiting death stay in the engine, in `keepDemonAsleep`.
- The two branches leave `completeBmrStep`.

## What stays

- **The two rules.** The removed branches and the two resolvers write the
  same choice record, the same effects in the same order with the same ids,
  the same notes on both steps and the same log lines.
- **The command checks.** That the Devil's Advocate's player is living, and
  that neither role repeats last night's choice, stay in `night.ts` with the
  other command checks.
- **The readers.** The execution check in `effects.ts`, the step builder's
  "different to last night" and the Exorcist's note in the information path
  of a step still name the roles.
- **The Goon.** Its trigger in `bmr.ts` still runs before the step resolves.

## Impact

Behavior is unchanged. The queue of every night, the record of each step
and of the Demon's step, the effects with their ids and flags, the choice
records, the deaths, the log lines, the command results and the order of
draws from the command ports stay the same, so saved games and journals
replay as before. No storage, command payload, schema, ruleset version or
pin changes.

The other Bad Moon Rising roles keep their legacy step and their branch in
`completeBmrStep` until their own changes.

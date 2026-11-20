# Bad Moon Rising night steps as capabilities: the Sailor and the Innkeeper

Issue: #200

## Why

Slice 3 of ADR 0002 moves the remaining Bad Moon Rising night steps to the
`night-step` capability. The Sailor and the Innkeeper are the first of them
whose rule still lives in `completeBmrStep`: two branches that end the
role's earlier effects, stop on an impaired owner and write dated effects by
hand. They are also the two roles that make a player drunk, and the
Innkeeper's players are safe from every ability, not only the Demon. Neither
can be written with the contract as it is: the context has no host answer
for who is drunk, the dated effects have no drunk or safe kind, and a
`suppressed` ability ends nothing, while both roles end last night's choice
even when the ability fails.

## What changes

- The Sailor's module declares its step and its resolver on a `night-step`
  capability for every night ("Each night", Sailor r1768).
- The Innkeeper's module declares its step and its resolver on a
  `night-step` capability for the nights after the first ("Each night
  except the first, wake the Innkeeper", Innkeeper r3160).
- The ability context gains `drunkId`: the host's answer for who the
  ability makes drunk. The command path still checks the answer.
- The `timed-effect` intent gains two kinds: `drunk`, and `safe` for a
  player who cannot die tonight. The engine stores `safe` as the protection
  the death path already reads for the Innkeeper.
- The `night-step` arm gains `endsOnUse`: the kinds of dated effect each use
  of the ability replaces. The engine ends the effects of those kinds that
  the ability gave before the resolver reads the owner's health, also when
  the ability fails now.
- `givenBy` in `effects.ts` says which effects an ability gave. The Goon's
  drunkenness names its chooser as the source and stays the Goon's.
  `replacesPrevious` uses the same predicate.
- The two branches leave `completeBmrStep`.

## What stays

- **The two rules.** The removed branches and the two resolvers write the
  same effects in the same order, with the same ids, notes and log lines.
- **The command check.** Who may be named drunk, and that a working Sailor
  or Innkeeper needs the answer, stays in `night.ts` with the other command
  checks.
- **The effect readers.** The Sailor's "can't die", the Innkeeper's
  protection and the drunk lookup in `effects.ts` are shared mechanics and
  still name the roles.
- **The Goon.** Its trigger in `bmr.ts` still runs before the step resolves.

## Impact

Behavior is unchanged. The queue of every night, the record of each step,
the effects with their ids and flags, the deaths, the log lines, the command
results and the order of draws from the command ports stay the same, so
saved games and journals replay as before. No storage, command payload,
schema, ruleset version or pin changes.

The other Bad Moon Rising roles keep their legacy step and their branch in
`completeBmrStep` until their own changes.

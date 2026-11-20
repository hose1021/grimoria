# Sects & Violets night steps as capabilities: the four Demons

Issue: #200

## Why

Slice 4 of ADR 0002 moves the Sects & Violets night steps to the
`night-step` capability. The Fang Gu, the No Dashii, the Vigormortis and the
Vortox are the Sects & Violets roles whose wake reads no game state and
whose completion has nothing of its own: the host marks the death, the
Fang Gu's jump and the Vigormortis's poison on the outcome of the step,
and `recordSvOutcome` checks and applies them. Their steps are still legacy
`nightStep` fields, and `completeSvStep` has no path for a role that owns a
resolver, so no Sects & Violets role can move yet.

## What changes

- The four modules declare their step and their resolver on a
  `night-step` capability for the nights after the first ("Each night
  except the first", Fang Gu r2974, No Dashii r3158, Vigormortis r3015,
  Vortox r3017). Each resolver returns `no-effect`, as the Tinker's does:
  the death is the host's mark on the outcome.
- `completeSvStep` hands a role that owns a resolver to the coordinator,
  as `completeBmrStep` does, after the seat's record exists. A migrated
  role never reaches the branches below.

## What stays

- **The four rules.** No branch is removed: the completion of a Demon's step
  did nothing of its own and still does nothing. The step record, the
  shared note and log line and the draws from the command ports are the
  same.
- **The outcome.** The deaths marked by the host, the refusal of a drunk or
  poisoned Demon's kill (`error.52`), the Fang Gu's jump and the
  Vigormortis's poison stay in `recordSvOutcome`.
- **The shared mechanics.** The Demon set, the No Dashii's and the
  Vigormortis's poison, the Vortox's false information in `sv.ts` and
  `day.ts`, and its win at dusk in `death.ts`.
- **The step builder.** The living holder of a Demon role wakes, and a
  Minion the Vigormortis keeps still wakes, as before.
- **The contract.** No intent, decision or fact is added.

## Impact

Behavior is unchanged. The queue of every night, the record of each step,
the effects with their ids and flags, the deaths, the log lines, the command
results and the order of draws from the command ports stay the same, so
saved games and journals replay as before. No storage, command payload,
schema, ruleset version or pin changes.

The other Sects & Violets roles keep their legacy step and their branch
until their own changes: the Cerenovus, the Pit-Hag, the Snake Charmer and
the Mathematician have a completion of their own, the information roles
keep their answers in `svInfoForStep`, and the eight roles whose wake is
read from the game through `actor` hooks wait for a contract for who wakes.

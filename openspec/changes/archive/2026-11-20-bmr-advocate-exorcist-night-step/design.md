# Design

## The removed branches

`completeBmrStep` resolved both roles in place.

The Devil's Advocate, when the step named a player:

1. wrote the player and the night as the role's choice record;
2. ended every protection from execution it had given;
3. on an impaired owner, wrote the failure note and stopped;
4. otherwise added a protection for the player: kind `devilsadvocate`, the
   night as its start, the night's number as its `day`, ending when the next
   night starts.

The Exorcist:

1. wrote the player and the night as the role's choice record, or no player
   and no night;
2. on an impaired owner, wrote the failure note and stopped;
3. when the player's character was a Demon, found the Demon's unfinished
   step in tonight's queue. A Shabaloth's step stayed open with no target,
   no kill and its regurgitation; any other Demon's step was finished and
   skipped. Either way it got the note that the Exorcist chose the Demon.
   Then a secret log line was added, and a Pukka's waiting death resolved
   and was reported on the Exorcist's step.

The resolvers return the same intents in the same order, and the engine
applies them with the same ids, keys and flags.

## The timing of each role

- **The Devil's Advocate: `first` and `other`.** "Each night, choose a
  living player" (r2594). The printed order lists it on the first night and
  on the other nights. The legacy module declared two steps that differ only
  in their note, so the module declares two arms with one resolver.
- **The Exorcist: `other`.** "Each night\*"; "Each night except the first,
  wake the Exorcist" (r2973). The printed first-night order does not list
  it. As for the Gambler and the Innkeeper, the legacy field gave it a
  first-night step that no reader asked for.

The test "a night-step arm agrees with the printed night order of its
edition" accepts only these timings.

## The choice record

"Different to last night" is about the choice, not about whether the ability
worked, so both branches recorded it before they checked the owner's health.
`record-choice` names the player, or nobody. The engine writes it under the
acting role's own record, `<role>Target` and `<role>TargetNight`, which the
step builder already reads, so a role cannot write another role's record or
another seat's. Like `record-master`, it is applied on the `suppressed`
path too. Nobody chosen writes no player and no night; only the Exorcist's
branch did that, and no command reaches it, because both steps take exactly
one player.

## The protection from execution

`survives-execution` is a player who does not die if executed the next day.
The execution check already reads the Devil's Advocate's protection by its
kind and its `day`, so the engine stores the new kind that way: kind
`devilsadvocate`, and `day` after `start`, the key order of the removed
branch. The stored shape and the reader share `SURVIVES_EXECUTION_EFFECT` in
`effects.ts`, as the Innkeeper's safety shares `SAFE_EFFECT`.

The Devil's Advocate's arms declare `endsOnUse: ["survives-execution"]`, so
last night's protection ends before the resolver reads the owner's health,
also when the ability fails now. An impaired Devil's Advocate's decision is
`suppressed` with only the choice record: the removed branch wrote no
protection on that path, so the resolver returns no dated effect there, not
even one kept as a record.

## Keeping the Demon asleep

"The Demon, if chosen, learns who you are then doesn't wake tonight" is the
Exorcist's rule, so the resolver decides it: a working Exorcist whose
player's character is a Demon returns `block-demon` with that seat. The role
also writes what the host reads: the note on the Demon's step with the
Exorcist's name, and the log line. What a Demon that does not wake still
does is the Demon's and stays in the engine, in `keepDemonAsleep` in
`bmr.ts`: the Shabaloth keeps its regurgitation (Shabaloth r1790, Exorcist
r2973 "Any other Demon abilities still function"), and the Pukka's waiting
death resolves now. The engine needs the blocking step for that report, so
`applyEffect` now receives the step.

`keepDemonAsleep` lives in `bmr.ts` beside the other Bad Moon Rising step
code and the Pukka's death path it calls. `ability.ts` imports it, and
`bmr.ts` already imports `applyRoleAbility`; the two modules only call each
other at run time, as `night.ts` and `death.ts` already do.

The engine trusts the role to name a Demon's seat, as it trusts `kill` to
name a player: the intent does not check the character again.

## One difference no command reaches

The Devil's Advocate's branch did nothing without a player. The resolver
returns `no-effect` then, but the arm's ending runs before the resolver. A
completion without a player is rejected before the step resolves
(`error.39`: both steps take exactly one player), so no command reaches the
difference.

## What does not move

- `effects.ts` names the Devil's Advocate as the reason in the execution
  check, beside the constant of its stored shape.
- `night.ts` names the Devil's Advocate among the roles that must choose a
  living player.
- `bmr.ts` names both roles where the step builder reads last night's
  choice, and the Exorcist in the information path of its step, which
  tells the host whether the Demon was chosen. Both are step building and
  information, not step completion.
- `keepDemonAsleep` names the Shabaloth and the Pukka.

## The ledger

Both rows declare `capability:night-step` and move from "engine branch" to
"capability + engine reference": the Devil's Advocate keeps `effects.ts`×2,
`night.ts`×1 and `bmr.ts`×1, the Exorcist `bmr.ts`×2. The counts become 19
and 47. The Shabaloth's and the Pukka's rows do not change: their names
moved within `bmr.ts`.

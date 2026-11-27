# Trouble Brewing night steps as capabilities: Imp

Issue: #200

## Why

`completeStep` in `night.ts` still resolves the Imp's attack in a role branch.
The branch calls the shared attack path, returns the Mayor's redirect question
to the host, and writes the attack's own step record and log line. The module
declares a target mode and the succession capability, but not the attack.

`tb-night-step-capabilities` moved the Poisoner and the Monk and
`tb-butler-night-step` moved the Butler. The Imp was left for its own review
for two reasons: its step can stop for a host choice before anything is
written, and its record is not the one the shared step completion writes. This
change is the next pull request of ADR 0002 slice 2, "Night steps: Trouble
Brewing remainder".

## What changes

- `AbilityDecision` gains `attack`: the acting ability attacks one player as
  the Demon, under a log title the role gives. The role names no attacker, no
  redirect and no cause of death.
- The coordinator runs an `attack` through `resolveAttack` with the acting
  seat as the attacker and the host's answer as the Mayor's redirect.
- `applyRoleAbility` takes the host's answers as one object (the character
  answer and the redirect) and returns an outcome: the decision was applied,
  the step waits for the redirect with nothing written, or an attack was
  resolved and keeps its own record.
- The Imp declares a `night-step` capability for every night except the first
  and resolves its choice in its module. The step completion in `night.ts`
  keeps no Imp branch; the attack's record moves unchanged into the attack
  step finisher, which takes the log title from the decision.
- `docs/role-ownership.md`: the Imp row declares `capability:night-step`
  instead of the legacy `nightStep`, and loses one `night.ts` reference. The
  summary counts do not move, because the Imp already had a capability.

## Impact

Behavior is unchanged. The death record and its id, the attack outcome on the
step, the notes, the secret log lines and their order, the journaled redirect,
the succession, the heir question, the win check, the command events, the
order of draws from the command ports, the redirect question and the error
code stay the same, so saved games and journals replay as before. No storage,
command payload, schema or pin changes.

The Gambler and the Pukka reach the coordinator with the same character
answer as before, now inside the answers object. The Poisoner, the Monk and
the Butler return no attack, so their steps finish through the shared path as
before.

The shared succession in `death.ts` and `becoming.ts`, the redirect prompt of
the table read model, the Bad Moon Rising and Sects & Violets Demons and the
Trouble Brewing information roles are not part of this change.

# Design

## Context

`requires-storyteller-choice` keeps every discretionary answer out of the
engine's computation. A night information step stores the host's answer in
`step.given`; a legal option list in `info.options` makes the answer a checked
value, and `recordHostChoice` writes the secret journal line. An answer without
options is free text and is never validated.

The pinned text:

- Dreamer r2904 "Summary": one good and one evil character, one correct. "How to
  Run": if the chosen player is a Townsfolk or Outsider, show their character
  and any Minion or Demon; if a Minion or Demon, show their character and any
  Townsfolk or Outsider. The Vortox example shows two characters that are both
  false.
- Sage r3009 "How to Run": point at two players, one who is the Demon that
  killed the Sage. The example allows one alive and one dead player.
- Pacifist r2601: "Executed good players might not die." The Storyteller decides
  whether the ability applies.

## Mechanical consequence inventory

The rule IDs and asserting tests below are the audit trail for the issue's
first deliverable. Every row is a host decision that changes game state.

| Decision | Rule ID / pin | Validation | Effect and journal | Test evidence |
| --- | --- | --- | --- | --- |
| Mayor redirect | TB-MAYOR-01, Mayor r2995 | `attackNeedsRedirect`; a redirect is asked only for a lethal attack on a sober living Mayor | `resolveAttack` kills the chosen target or nobody; `recordHostChoice("mayor-redirect")`; win check | `engine.test.ts` "an Imp attack on a working Mayor is a host choice on the command path and the answer completes it"; `commands.test.ts` "validate reports a Storyteller choice for a Mayor redirect"; `coordinator.test.ts` "a Mayor redirect choice leaves every stage record unchanged" |
| Demon heir | TB-IMP-01, Imp r3116 | `chooseDemonHeir` requires a pending inheritance step and a living Minion | `becomeDemon`, the new Demon wakes once, `checkWin`, a secret choice line | `engine.test.ts` "an Imp self-kill with several living Minions holds the win check until the host names the heir" |
| Pacifist survival | BMR-PACIFIST-01, Pacifist r2601 | `execute`/`executeByDecision` accept `survives` only for a good target with a living, unimpaired Pacifist | No death; execution records `prevented`; the new choice line records the reason | `bmr.test.ts` "the Pacifist saves only a good player the day executes"; this change adds the journal assertion |
| Tinker death | BMR-TINKER-01, Tinker r1782 | `tinkerDeath` requires a living, unimpaired Tinker; midnight/step deaths go through the outcome control | Ability death through the shared `kill`; death line records the ability | `bmr.test.ts` "the Tinker, the Po and the Shabaloth have a step from the second night..."; `interactions.test.ts` "a Tinker who dies during the day lets the Godfather kill that night" |
| Madness penalty | SNV-CERENOVUS-01, Cerenovus r3048; SNV-MUTANT-01, Mutant r1755 | `applyMadnessPenalty` requires an active token, a listed penalty and a non-empty reason; one decision per day | Execution through `executeByDecision` or no consequence; token stores day, penalty and reason; secret line | `snv.test.ts` "the madness penalty records its case" and the Cerenovus/Mutant execution tests |
| Evil Twin pairing | SNV-EVILTWIN-03/05, Evil Twin r3101 | `manualCorrection kind: "twin"` requires an Evil Twin holder, a distinct partner and opposing alignments; a gained character leaves the pair unset and blocks the night | Stored pair drives the win and the good-win block; correction line records the reason | `twin-correction.test.ts` "a twin correction undoes and redoes through the journal"; `evil-twin-choice.test.ts` "an unchosen pair never awards the Evil Twin win..." |
| Slayer against a Recluse | TB-SLAYER-01, Slayer r3122; TB-RECLUSE-02, Recluse r3007 | `useSlayer` reads `recluseRegistersDemon` only for a sober Recluse | A hit dies through the shared `kill`, not as an execution | `engine.test.ts` "a sober Slayer kills a Recluse registered as the Demon (TB-SLAYER-01, TB-RECLUSE-02)" and the impaired-Recluse mirror |
| Virgin against a Spy | TB-VIRGIN-01, Virgin r1729; TB-SPY-01, Spy r3118 | `recordVirginNomination` reads `spyRegistersTownsfolk` only for a sober Spy; the first nomination spends the ability | A qualifying nominator is executed at once; the ability is spent even when nobody dies | `engine.test.ts` "a sober Spy registered as a Townsfolk triggers the Virgin (TB-VIRGIN-01, TB-SPY-01)"; `tb-audit.test.ts` "a Spy that does not register as a Townsfolk leaves the Virgin alive but spent (TB-VIRGIN-01)" |
| Gossip statement | BMR-GOSSIP-01, Gossip r1782 | `gossipStatement` requires a living Gossip; the host declares the statement true or false | A true statement schedules an ability death for the night; a false one schedules none | `bmr.test.ts` "the Gossip statement schedules a night death only when it was true (BMR-GOSSIP-01)"; `bmr.test.ts` "the Gossip's Storyteller-chosen death does not trigger the Goon (BMR24)" |
| Professor / Shabaloth resurrection | BMR-PROFESSOR-01, Professor r1775; BMR-SHABALOTH-01, Shabaloth r1790 | `recordBmrOutcome` accepts a resurrection only on the two steps whose ability brings a player back | The chosen dead player returns; other steps refuse `error.51` | `bmr.test.ts` "the Professor resurrects a dead Townsfolk only (BMR-PROFESSOR-01)"; `engine.test.ts` "a night step whose ability does not resurrect brings no one back (BMR-PROFESSOR-01, BMR-SHABALOTH-01)" |
| Pit-Hag arbitrary deaths | SNV-PITHAG-01, Pit-Hag r2998 | `recordSvOutcome` accepts deaths only on a step that can kill, or a Pit-Hag step that created a Demon | Ability deaths; the Vigormortis neighbour poison from the same outcome | `snv.test.ts` "a Demon the Pit-Hag makes does not wake tonight, and the host marks the night's deaths on the Pit-Hag's step" |

Information-only decisions (Chef, Empath, Fortune Teller, Dreamer, Sage, Artist,
Savant, Vortox lie) change no seat, effect, death or winner. The Dreamer and
Sage now join the checked subset.

## Decisions

### Pair options are computed from the pinned constraint

`characterPool` reads the script's roles by team. The Dreamer's true character
is the chosen player's current `roleId`; the false character is of the opposite
kind. A living Vortox removes every pair that contains the true character,
because its information must be false. Impairment alone keeps the true pair
legal.

The Sage's pair contains exactly one current Demon while sober. Under a living
Vortox no pair contains the Demon. Impairment keeps both answers legal. The
option list uses ordered seat pairs, and the step keeps the pair as player ids.

Both steps always require the answer: the host already shows it at the table,
and the issue requires the app to record what was shown instead of guessing.

### One journal case for a shown pair

`information-pair` names the secret choice line, and `describeGiven` renders a
role pair as role ids and a player pair as seat names. The line is secret, the
public view never reads the step, and `exportGame` carries the queue unchanged.

### The Pacifist reason is its own line

The existing execution line says that nobody died but not why. A secret
`pacifist-survival` line names the spared player, so the reason survives reload
and replay with the execution.

## Risks and trade-offs

- A pair recorded for a target that later changes is rejected by
  `givenIsLegal`, because the option list is recomputed from the current state.
  The host sees the same `error.66` as any other stale answer.
- A script with no evil character in play cannot produce a legal Sage pair; the
  completion falls back to the full pair list instead of blocking forever.
- The pair is an audit record, not a rules engine: it does not enforce which
  character a Spy or Recluse registers as. That remains the documented matrix
  limitation.

## Test plan

- `snv.test.ts`: Dreamer legal pairs, rejected wrong-kind pair, impaired and
  Vortox option sets, Sage one-Demon pairs, rejected pair, Vortox exclusion.
- `snv.test.ts`: preview, apply, replay, undo and export/import with a pair.
- `bmr.test.ts`: Pacifist survival writes the choice line with the reason.
- `strings.test.ts`: the new catalog keys resolve in all three locales.
- Browser: the pair select renders in RU, EN and AZ at 390 px and desktop.

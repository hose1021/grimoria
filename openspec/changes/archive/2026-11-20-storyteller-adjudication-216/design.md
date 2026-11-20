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

`supportedRolesOf` reads every supported character by kind. A custom script
does not narrow the legal answer: the official text names a kind, not the bag.

The Dreamer's true character is the chosen player's character or any character
that player legally registers as: Spy r3118 and Recluse r3007 may register as
another character, so the host may show one of those. The false character is of
the opposite kind. A living Vortox removes every pair that contains the raw
character of the chosen player, because its information must be false; the
registration remains the host's choice. Impairment alone keeps the true pair
legal. An empty legal list (a target without a character) refuses every answer.

The Sage's pair contains exactly the player who killed the Sage as the Demon.
The attack records its source on the death (`attackerId`); the information
reads that record, so a later character or holder change does not move the
pair. A death written before the field existed falls back to the current
Demon. Under a living Vortox no pair contains the killer; impairment keeps
both answers legal. The option list uses every seat pair, including a dead
player, as the pinned example allows.

Both steps always require the answer: the host already shows it at the table,
and the issue requires the app to record what was shown instead of guessing.

### Released journals keep the old answer

`INFO_PAIR_RULESET_VERSION` (`tb-bmr-snv-2026-11-18`) is the first version that
requires the pair. A recorded command under an earlier version keeps the 0.4.1
behavior: the info is the free-text note, `needsChoice` is true only for false
information, and a note answer is accepted. The released version
`tb-bmr-snv-2026-11-17.4` stays in the supported set. A current command without
a version, or with the new version, requires the pair. The death `attackerId`
is written only from the new version, so replaying an old journal does not add
a field to its deaths and break equality.

The regression fixture `fixtures/legacy-dreamer-sage-game.json` was generated
by the released 0.4.1 engine and holds a sober Dreamer and a sober Sage command
without a pair. It proves import, export, replay, undo and continuing the game.

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
- An empty pair list (a target without a character) refuses every answer. It
  never falls back to an all-pairs list.
- The pair is an audit record, not a rules engine: the Vortox rule excludes the
  raw character, and the host still decides how a Spy or Recluse registers.
  Supported single-edition scripts never hold the Dreamer (S&V) together with
  the Spy or Recluse (TB); the registration test covers the engine path on a
  constructed state, and the matrix keeps the character-registration
  limitation.

## Test plan

- `snv.test.ts`: Dreamer legal pairs, a registered Spy/Recluse character, a
  custom-script pair, the empty-list refusal, rejected wrong-kind pair,
  impaired and Vortox option sets.
- `snv.test.ts`: the Sage pair names the killer after the Barber moves the
  Demon character, includes a dead player, and rejects a pair without the
  killer.
- `snv.test.ts`: a 0.4.1 fixture replays, undoes and continues; old-version
  commands keep free-text answers while current commands require the pair.
- `snv.test.ts`: preview, apply, replay, undo and export/import with a pair.
- `engine.test.ts`: Pacifist survival writes the choice line with the reason.
- `strings.test.ts`: the new catalog keys resolve in all three locales.
- Browser: the pair select renders in RU, EN and AZ at 390 px and desktop; the
  Vortox scenario asserts the false pair content and the Sage scenario asserts
  the killer pair.

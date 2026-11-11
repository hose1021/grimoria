# Design

## Decision

Each role gets an explicit decision from the pinned ability text
(`docs/official/roles.json` and the matrix revision links):

- **Goon — automated.** The first player to choose the Goon each night becomes
  drunk immediately: their ability does not work tonight or the next day, and
  the Goon takes their alignment until the next dusk. A second chooser changes
  nothing. A drunk or poisoned Goon has no ability, but a chooser who was
  already drunk or poisoned still triggers the Goon because they still chose.
  The Lunatic's simulated choice and the Grandmother's Storyteller pick do not
  count as choosing with an ability. Two printed exceptions stay: when the
  Assassin chooses the Goon the Goon dies but still turns evil, and the
  Moonchild's already-made choice still resolves even though the Goon makes the
  Moonchild drunk
  ([Goon r2977](https://wiki.bloodontheclocktower.com/index.php?title=Goon&oldid=2977)).
- **Lunatic — automated.** The deal stores the shown Demon and the player stays
  good. The night-one Demon information names the Lunatic; every later Demon
  step carries the Lunatic's name and last choice. The Lunatic's own step never
  kills
  ([Lunatic r3112](https://wiki.bloodontheclocktower.com/index.php?title=Lunatic&oldid=3112)).
- **Mastermind — automated.** The existing extra day already decided the loser
  by the executed player's real alignment; the change adds the evil-executed
  half and both reasons are asserted
  ([Mastermind r2993](https://wiki.bloodontheclocktower.com/index.php?title=Mastermind&oldid=2993)).
- **Pacifist — host choice.** The printed ability says executed good players
  *might* not die. The existing execution `survives` control records the
  Storyteller's decision; the role status explains it next to the control
  ([Pacifist r2601](https://wiki.bloodontheclocktower.com/index.php?title=Pacifist&oldid=2601)).
- **Tinker — host choice.** "You might die at any time" has no deterministic
  trigger. The night step exists, carries a `canKill` outcome control and the
  reason, and stays a host decision
  ([Tinker r1782](https://wiki.bloodontheclocktower.com/index.php?title=Tinker&oldid=1782)).

## Goon ordering and state

The trigger is resolved in `completeStep` after the information gate and before
the ability, so the chooser is already drunk when the ability resolves. The
details that matter:

- The granted drunk is sourced by the chooser themselves. Every effect the
  chooser creates is therefore a dependent of that drunk and stays inactive, so
  a Pukka, Sailor or Innkeeper who chooses the Goon neither poisons, drinks nor
  protects anyone. That is also what keeps the effect graph acyclic: the earlier
  Goon-source/chooser-target cycle with the chooser's own poison or drunk is
  gone.
- `permanent: true` is the effect graph's "outlives its source" marker: the
  granted drunk keeps its printed lifetime even if the chooser is impaired again
  or dies. The Sailor and Innkeeper own-effect purges skip `bmr: "goon"` effects,
  so they cannot delete the grant they just caused.
- `step.goonImpaired` gates the outcome: `recordBmrOutcome` rejects a death or
  resurrection for that step with `error.52`. The information preview uses
  `bmrGoonWouldTrigger`, so the host is asked for false information before the
  step completes.
- `step.goonImpairedOnly` records that the Goon's drunk is the only impairment.
  The Assassin and the Moonchild use it to resolve their printed effect anyway:
  the Assassin still kills the Goon (which still turns evil), and the Moonchild's
  stored choice still kills. Their outcomes are not gated either. If the chooser
  was already impaired before the trigger, the exception does not apply.
- The trigger runs only for a role step that targets the Goon. `NO_GOON_CHOICE`
  excludes the Lunatic's simulated choice and the Grandmother's
  Storyteller-chosen grandchild.

The effect carries `bmr: "goon"`; its presence with the current night stamp is
the "first chooser" marker, so no extra player field is needed. The alignment is
written to `player.team`, the field `realTeamOf` already prefers, so the Tea
Lady, registration-free alignment checks and the public view follow it.
Immediate effects that do not create an effect (the Professor, Gambler and
Exorcist) check impairment explicitly. The Assassin and Moonchild also check it,
but bypass the Goon-granted drunk through `goonImpairedOnly`; the Assassin's
protection bypass stays explicit.

## Demon report surfaces

`demonInfoStep` already exists on night one for seven or more players. It now
carries `lunaticId`, and `infoText` appends the Lunatic to the Demon card.
Every Demon role step gets `infoKind: "note"` only while a Lunatic is in play,
so `bmrInfoForStep` supplies the name and last choice. This keeps the existing
TB-shaped system step untouched.

## Support status

`bmrRoleSupport(roles)` returns the audited roles that are in play with a
status and an i18n detail key. The secrets screen lists all of them; the night
step card and the day execution control show the same entry next to the
decision. `host-choice` rows keep their existing controls; nothing switches to
a silent manual fallback. The matrix legend is the status vocabulary, so the UI
uses the same three words.

## Alternatives

- Automate the Tinker's death or the Pacifist's survival: rejected. Both
  abilities explicitly leave the outcome to the Storyteller ("might").
- Let the chooser's ability resolve after the Goon trigger: rejected. r2977 says
  the chooser is drunk immediately, so their ability does not work; the
  Shabaloth example is that neither target dies.
- Keep the Goon as the granted drunk's source: rejected. A chooser that puts a
  poison or drunk on the Goon then forms a source/target cycle and the command
  is rejected; sourcing the drunk by the chooser removes the cycle and disables
  the chooser's own effects.
- Skip the trigger when the chooser was already drunk or poisoned: rejected.
  r2977 cares that they chose with their ability, not that the ability worked.
- Add a per-night field to `Player.used` for the first chooser: rejected. The
  granted effect already records the night and the chooser, and the effect is
  what the rules define.
- Rebuild the Demon information card: rejected. Extending the existing step
  keeps the official night order and the current UI shape.

## Compatibility

No schema or command payload change. `corrections` and legacy saves load: a
save without the Goon effect simply has no grant yet. Old saves with a
`setup.lunaticShownId` keep it; the new `lunaticId` step field is optional.

## Risk

- The Goon trigger fires on information roles that choose the Goon, matching
  "the 1st player to choose you with their ability". The test uses the Demon and
  the Chambermaid.
- A dead Moonchild's next-night step can choose the Goon. The trigger applies
  and the Goon changes alignment, but the already-made Moonchild choice still
  kills: the step is bookkeeping, not a new choice, so the granted drunk does not
  suppress it. If the Moonchild was already impaired before the trigger, the
  kill is suppressed as usual.
- When the Assassin chooses the Goon, `goonImpairedOnly` exempts the Assassin's
  kill and its outcome, so the Goon dies and still turns evil (r2977). An
  Assassin impaired by another source still loses the ability.
- At six players the Demon information step is not built (no bluffs). A Po has
  no first-night step, so the host still tells the Demon about the Lunatic.
  `docs/rules-sources.md` records this limit.

## Verification

- RED: the first round's Goon and Lunatic tests failed against the engine before
  the change; the Mastermind and support tests verify behavior and data that
  already existed in part.
- RED (review): the pre-review engine rejects a Pukka, Sailor or Innkeeper
  choosing the Goon with `CYCLIC_EFFECT_DEPENDENCY`; the already-drunk chooser,
  Chambermaid information, Shabaloth outcome, Lunatic and Grandmother tests also
  fail. 8 of 19 focused tests fail; `js/bmr.test.mjs` records the exact
  assertions.
- GREEN: the focused tests pass on the rebased tree (22/22), `js/bmr.test.mjs`
  has 81 passing tests and `npm test` has 370.
- `node scripts/openspec-check.mjs`, `openspec validate --changes --strict` and
  `openspec validate --specs --strict` pass.

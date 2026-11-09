# Rules matrix

Audited on 2026-11-10 for the supported ruleset. This document is the
implementation baseline for issue #19: it records what the engine automates,
what stays a Storyteller decision, what is untested, and what is unsupported.
It is not a rules authority by itself; every row cites the official wiki
revision and the executable test.

## Supported ruleset pin

The app version audited here is commit `763d16c` (2026-11-10), with the
official data snapshot committed in `43d2128` (2026-11-03).

| Source | Pinned version | Use |
|---|---|---|
| [Trouble Brewing](https://wiki.bloodontheclocktower.com/Trouble_Brewing) | r3128, 2026-11-09 | Roster, teams, setup, night order. |
| [Bad Moon Rising](https://wiki.bloodontheclocktower.com/Bad_Moon_Rising) | r2871, 2025-07-20 | Roster, teams, setup, night order. |
| [Sects & Violets](https://wiki.bloodontheclocktower.com/Sects_%26_Violets) | r3127, 2026-11-09 | Roster, teams, setup, night order. |
| [Setup](https://wiki.bloodontheclocktower.com/Setup) | r1361, 2023-04-05 | Player counts, composition, secret bag. |
| [Rules Explanation](https://wiki.bloodontheclocktower.com/Rules_Explanation) | r1310, 2023-04-03 | Death, voting, one dead vote. |
| [Glossary](https://wiki.bloodontheclocktower.com/Glossary) | r3168, 2026-11-09 | Terms: alive, dead, execution, poison, drunk, register. |
| [States](https://wiki.bloodontheclocktower.com/States) | r1039, 2023-03-23 | Drunk and poison behavior and timing. |
| `docs/official/nightsheet.json` | committed 2026-11-03 | Night order for all three scenarios. |
| `docs/official/roles.json` | committed 2026-11-03 | Role metadata and ability text (181 entries; 72 standard roles used here). |

Role rows carry the wiki revision that was checked, for example
`[r2630](https://wiki.bloodontheclocktower.com/Washerwoman)`. Jinxes are
listed on individual role pages under "Related Jinxes"; there is no separate
jinx page, and the app does not model any jinx (see "Custom scripts").

The ruleset is the three core editions only: 22 Trouble Brewing, 25 Bad Moon
Rising and 25 Sects & Violets roles. Travellers, Fabled, Loric and Carousel
roles are outside this supported set.

## Status legend

| Status | Meaning |
|---|---|
| `verified` | The official text is pinned, the engine implements the mechanic, and at least one test asserts the observable behavior. |
| `implemented-unverified` | The engine has code or a step for the mechanic, but no test asserts the behavior, or the test covers only part of it. |
| `host-choice` | The official text leaves the decision to the Storyteller. The app creates a step and stores the input, but does not resolve the rule automatically. |
| `unsupported` | The mechanic is not modeled. The host must resolve it outside the engine, and the app must not present it as automated. |

A row marked `host-choice` or `unsupported` is not a defect by itself: the
issue requires the app to expose only legal options and to mark manual
resolution. It becomes a defect when the app claims automation it does not
have, or when it offers no legal host control.

## Baseline

Run `node --test js/*.test.mjs` on Node 24. The audited baseline is
**143 tests, 143 pass, 0 fail**:

| File | Tests | Scope |
|---|---:|---|
| `js/engine.test.mjs` | 49 | Trouble Brewing setup, night, day, death, effects, information, wins, idempotency, privacy. |
| `js/bmr.test.mjs` | 22 | Bad Moon Rising roster, order, targets, protections, conditional wakes, Minstrel, Mastermind, Zombuul. |
| `js/snv.test.mjs` | 15 | Sects & Violets roster, order, Evil Twin, Vortox, Witch, Fang Gu, No Dashii, Vigormortis setup. |
| `js/scripts.test.mjs` | 12 | Official and custom script import, validation, migration. |
| `js/presets.test.mjs` | 11 | Official presets and generated legal bags. |
| `js/store.test.mjs` | 9 | Persistence, rollback, migration, stale tabs. |
| `js/manual.test.mjs` | 8 | Mixed-edition manual-only games. |
| `js/library.test.mjs` | 6 | Saved pools and bags. |
| `js/offline-worker.test.mjs` | 6 | Offline worker behavior. |
| `js/night.test.mjs` | 4 | Legacy `night.js` helper, unused by the app. |
| `js/strings.test.mjs` | 1 | en/ru/az key and parameter parity. |

The browser regression script `scripts/browser-check.mjs` is not part of
`node --test`; it runs in pull-request CI with Playwright.

### Reproducible defects found by the audit

These are recorded as RED candidates for later TDD PRs. They are not fixed by
this documentation-only change.

1. **Pukka poison is not tracked.** `bmrStepSpec` stores only a note; no
   `poison` effect is created in `completeBmrStep`. A poisoned player remains
   able to act until the host records the death. Issue regression scenario 1
   cannot pass as written. Target: remove this row's `unsupported`
   status in PR-04 with a RED test first.
2. **Juggler information is always 0.** `svInfoForStep` returns
   `{ kind: "number", value: 0 }` and sets no `needsChoice`, so `givenSelect`
   renders no override. Reproduction:
   `svInfoForStep(state, { roleId: "juggler", actorId }, {}) === { kind: "number", value: 0, ... }`.
   Target: PR-05.
3. **Fang Gu can jump more than once.** `recordSvOutcome` stores the
   `used.fanggu` flag on the old Demon, and the new Fang Gu starts without it.
   A second Outsider kill therefore jumps again, while the wiki says the jump
   happens once per game (r2974). Target: PR-05.
4. **Devil's Advocate may repeat the previous target.** The step note says
   "different to last night", but no previous target is stored or enforced.
   Target: PR-04.
5. **No event log or replay.** `store.js` keeps a 12-snapshot undo ring, not a
   deterministic event log. The issue's replay and mid-step recovery
   invariants are not met. Target: PR-02.
6. **Seven roles have no engine handling.** Goon, Pacifist, Tinker, Artist,
   Savant, Klutz and Mutant are listed as `host-choice` or `unsupported`
   below. This is explicit, not silent fallback.
7. **Travellers, Fabled, Loric and jinxes are not modeled.** Imported scripts
   reject Travellers; no jinx table exists. Target: PR-06.

### Critical transitions covered by tests

| Transition | Coverage |
|---|---|
| Bag → deal → seat → secrets → night → day → win | 7/10/12-player browser scenarios in `scripts/browser-check.mjs`; unit tests cover each domain step. |
| Demon death → inheritance or game end | `engine.test.mjs:318,335,354,770`; BMR/S&V wins in `bmr.test.mjs:205` and `snv.test.mjs:119,187`. |
| Night death before a later wake | `engine.test.mjs:897,911`. |
| Poison and drunk interval across night and day | `engine.test.mjs:224,267`; BMR windows are partly unverified. |
| Registration choices | `engine.test.mjs:788`; only the information-role path is asserted. |
| Votes, dead vote, threshold, execution vs death | `engine.test.mjs:431,455,475,542`. |
| Duplicate command protection | `engine.test.mjs:565`; `store.test.mjs:32`. |
| Save, rollback, migration, stale tab | `store.test.mjs:16,32,43,66,77,100,109,127`. |
| Public projection privacy | `engine.test.mjs:586`; browser checks for `/public` and `/player`. |

### Unknown and unverified rules

- Madness penalties (Cerenovus, Mutant) are not tracked; only the step note exists.
- Pit-Hag, Barber, Snake Charmer, Philosopher and Vigormortis character changes are not applied.
- Vortox false information and all information-role false results are host-supplied.
- Goon alignment and drunk, Pacifist survival, Tinker death and Klutz loss have no state model.
- Courtier, Innkeeper, Gambler, Shabaloth and Pukka effects have no tests.
- Registration after death is implemented by lookup, but not asserted end to end.
- Jinx interactions are unknown to the engine and must not be claimed as supported.

## Trouble Brewing

| Role | Ability (official) | When | Engine behavior | Host decision | Test | Status |
|---|---|---|---|---|---|---|
| `washerwoman` [r2630](https://wiki.bloodontheclocktower.com/Washerwoman) | You start knowing that 1 of 2 players is a particular Townsfolk. | First night | One-of-two pair from `setup.info`; team and pair validated; impaired → host-chosen false info. | Pick the true role and two players in `/secrets`; choose false info when impaired. | engine.test.mjs:198,847 | verified |
| `librarian` [r1721](https://wiki.bloodontheclocktower.com/Librarian) | You start knowing that 1 of 2 players is a particular Outsider. (Or that zero are in play.) | First night | Same one-of-two path; `zero` is allowed when no Outsider is in play and rejected otherwise. | Pick the Outsider and two players, or zero. | engine.test.mjs:198 | verified |
| `investigator` [r2983](https://wiki.bloodontheclocktower.com/Investigator) | You start knowing that 1 of 2 players is a particular Minion. | First night | Same one-of-two path for a Minion. | Pick the Minion and two players. | engine.test.mjs:198 | verified |
| `chef` [r2510](https://wiki.bloodontheclocktower.com/Chef) | You start knowing how many pairs of evil players there are. | First night | `chefCount` counts adjacent evil pairs in the seat ring; Spy/Recluse registration overrides apply. | Choose Spy/Recluse registrations. | engine.test.mjs:198,788 | verified |
| `empath` [r1724](https://wiki.bloodontheclocktower.com/Empath) | Each night, you learn how many of your 2 alive neighbors are evil. | Every night | `empathCount` counts evil among the two alive neighbours; registration overrides apply. | Choose Spy/Recluse registrations. | engine.test.mjs:198,788 | verified |
| `fortuneteller` [r3123](https://wiki.bloodontheclocktower.com/Fortune_Teller) | Each night, choose 2 players: you learn if either is a Demon. There is a good player that registers as a Demon to you. | Every night | `fortuneTellerYes` returns yes for the permanent red herring and for Demon registration; self and dead targets are allowed. | Pick the red herring in `/secrets`; choose the false answer when impaired. | engine.test.mjs:806,821,832 | verified |
| `undertaker` [r3115](https://wiki.bloodontheclocktower.com/Undertaker) | Each night*, you learn which character died by execution today. | Other nights, only after an execution death | The step exists only when `executionDeathForDay` finds a death; `characterChoices` honours Spy/Recluse registration. | Choose the shown character; false info when impaired. | engine.test.mjs:299 | verified |
| `monk` [r3124](https://wiki.bloodontheclocktower.com/Monk) | Each night*, choose a player (not yourself): they are safe from the Demon tonight. | Other nights | Adds a `protected` effect for tonight; self is rejected; the effect ends at dawn; an impaired Monk adds none. | Pick a player other than the Monk. | engine.test.mjs:241,267 | verified |
| `ravenkeeper` [r3125](https://wiki.bloodontheclocktower.com/Ravenkeeper) | If you die at night, you are woken to choose a player: you learn their character. | After a night death | A conditional step is appended only if the Ravenkeeper died tonight; chooses a target and shows a character. | Choose the character; false info when impaired; Spy/Recluse registration. | engine.test.mjs:280 | verified |
| `virgin` [r1729](https://wiki.bloodontheclocktower.com/Virgin) | The 1st time you are nominated, if the nominator is a Townsfolk, they are executed immediately. | Day, first nomination | The first nomination spends the ability; a Townsfolk nominator, or a Spy registered as Townsfolk, is executed at once; an impaired Virgin does not trigger. The Spy path is untested. | Choose the Spy registration; decide whether the ability works. | engine.test.mjs:371,387,945,959 | verified |
| `slayer` [r3122](https://wiki.bloodontheclocktower.com/Slayer) | Once per game, during the day, publicly choose a player: if they are the Demon, they die. | Day, once per game | `useSlayer` spends the ability even on a miss or while impaired; a Demon hit is a death, not an execution; Recluse may register as Demon. | Pick the target; choose the Recluse registration. | engine.test.mjs:401,418 | verified |
| `soldier` [r3121](https://wiki.bloodontheclocktower.com/Soldier) | You are safe from the Demon. | Passive | `soldierSafe` blocks Demon attacks while sober and healthy. | None. | engine.test.mjs:241 | verified |
| `mayor` [r2995](https://wiki.bloodontheclocktower.com/Mayor) | If only 3 players live & no execution occurs, your team wins. If you die at night, another player might die instead. | Night attack and end of day | A lethal attack on a sober Mayor asks for a redirect; an impaired Mayor has no ability; a redirect to a dead, Soldier or Monk-protected player kills nobody; at end of day, three living and no execution win for good. | Let the Mayor die, choose the replacement, or choose none. | engine.test.mjs:492,516,625,643,668,684,701,721,738,755 | verified |
| `butler` [r3120](https://wiki.bloodontheclocktower.com/Butler) | Each night, choose a player (not yourself): tomorrow, you may only vote if they are voting too. | Every night and day | The chosen master is stored as a `butler` effect; an illegal vote is counted with a private host warning. | Pick the master. | engine.test.mjs:856,877 | verified |
| `drunk` [r3165](https://wiki.bloodontheclocktower.com/Drunk) | You do not know you are the Drunk. You think you are a Townsfolk character, but you are not. | Setup and passive | `effectiveRoleId` returns `shownRoleId`, so the shown role wakes; `isImpaired` is always true; the mask cannot leak into bluffs. | Pick the shown Townsfolk role and the false information. | engine.test.mjs:153,387 | verified |
| `recluse` [r3007](https://wiki.bloodontheclocktower.com/Recluse) | You might register as evil & as a Minion or Demon, even if dead. | Passive | Registration overrides feed alignment, Chef, Empath, Fortune Teller and character information; `characterChoices` offers evil registrations. Chef and Fortune Teller paths are asserted; dead and Minion registrations are not. | Choose a registration for each query. | engine.test.mjs:788 | implemented-unverified |
| `saint` [r3119](https://wiki.bloodontheclocktower.com/Saint) | If you die by execution, your team loses. | On execution | `checkWin` reads `death.impaired`: a sober Saint executed by vote gives evil the win. | None. | engine.test.mjs:492 | verified |
| `poisoner` [r1737](https://wiki.bloodontheclocktower.com/Poisoner) | Each night, choose a player: they are poisoned tonight and tomorrow day. | Every night | Adds a `poison` effect with source, target, start and expiry; it ends at the next dusk, when the source loses the ability, or when the source dies. | Pick the target. | engine.test.mjs:224,267 | verified |
| `spy` [r3118](https://wiki.bloodontheclocktower.com/Spy) | Each night, you see the Grimoire. You might register as good & as a Townsfolk or Outsider, even if dead. | Every night | Grimoire step; registration overrides feed all information roles. The grimoire display itself has no test. | Show the grimoire; choose registrations; show a false grimoire when impaired. | engine.test.mjs:788 | implemented-unverified |
| `scarletwoman` [r3117](https://wiki.bloodontheclocktower.com/Scarlet_Woman) | If there are 5 or more players alive & the Demon dies, you become the Demon. (Travellers don't count.) | When the Demon dies | `resolveDemonDeath` requires five living before the death and a sober Scarlet Woman; the heir becomes the Demon and does not act again that night. | Pick the heir when several Minions are eligible after an Imp self-kill. | engine.test.mjs:318,335,770 | verified |
| `baron` [r2961](https://wiki.bloodontheclocktower.com/Baron) | There are extra Outsiders in play. [+2 Outsiders] | Setup | `compositionFor` adds two Outsiders and removes two Townsfolk. | None. | engine.test.mjs:102 | verified |
| `imp` [r3116](https://wiki.bloodontheclocktower.com/Imp) | Each night*, choose a player: they die. If you kill yourself this way, a Minion becomes the Imp. | Other nights | `resolveAttack` applies Monk, Soldier and Mayor; a self-kill passes the role to a Minion; the new Demon's remaining step is skipped. | Pick the target; resolve a Mayor redirect; pick the heir. | engine.test.mjs:241,354,911 | verified |

## Bad Moon Rising

| Role | Ability (official) | When | Engine behavior | Host decision | Test | Status |
|---|---|---|---|---|---|---|
| `chambermaid` [r2966](https://wiki.bloodontheclocktower.com/Chambermaid) | Each night, choose 2 alive players (not yourself): you learn how many woke tonight due to their ability. | Every night | Counts how many of the two chosen players had a role step wake tonight. | Pick two alive players; false number when impaired. | None | implemented-unverified |
| `courtier` [r2968](https://wiki.bloodontheclocktower.com/Courtier) | Once per game, at night, choose a character: they are drunk for 3 nights & 3 days. | Every night, once per game | Adds drunk effects to every player with the chosen character until three nights later. | Pick the character; once per game. | None | implemented-unverified |
| `exorcist` [r2973](https://wiki.bloodontheclocktower.com/Exorcist) | Each night*, choose a player (different to last night): the Demon, if chosen, learns who you are then doesn't wake tonight. | Other nights | Skips the chosen Demon's step; stores the previous target so it cannot repeat. | Pick a player; the Demon learns the Exorcist. | bmr.test.mjs:298 | verified |
| `fool` [r2636](https://wiki.bloodontheclocktower.com/Fool) | The 1st time you die, you don't. | Passive | `bmrCannotDie` prevents the first death; the Assassin bypasses it. | None. | bmr.test.mjs:175 | implemented-unverified |
| `gambler` [r3073](https://wiki.bloodontheclocktower.com/Gambler) | Each night*, choose a player & guess their character: if you guess wrong, you die. | Other nights | A wrong guess kills the Gambler; a Recluse may register as Demon. | Pick the target and the guess. | None | implemented-unverified |
| `gossip` [r1773](https://wiki.bloodontheclocktower.com/Gossip) | Each day, you may make a public statement. Tonight, if it was true, a player dies. | Other nights after a day statement | A true statement queues a kill step for the next night. | Record whether the public statement was true. | bmr.test.mjs:268 | verified |
| `grandmother` [r2978](https://wiki.bloodontheclocktower.com/Grandmother) | You start knowing a good player & their character. If the Demon kills them, you die too. | First night and on a Demon kill | Stores the grandchild on night one; appends a death step when the Demon kills the grandchild. | Pick the grandchild. | bmr.test.mjs:312 | verified |
| `innkeeper` [r3160](https://wiki.bloodontheclocktower.com/Innkeeper) | Each night*, choose 2 players: they can't die tonight, but 1 is drunk until dusk. | Other nights | Adds protection for both targets tonight and a drunk effect on one until dusk. | Pick two players and which one is drunk. | None | implemented-unverified |
| `minstrel` [r2600](https://wiki.bloodontheclocktower.com/Minstrel) | When a Minion dies by execution, all other players (except Travellers) are drunk until dusk tomorrow. | On a Minion execution | Makes every other living player drunk until dusk tomorrow. | None. | bmr.test.mjs:224 | verified |
| `pacifist` [r2601](https://wiki.bloodontheclocktower.com/Pacifist) | Executed good players might not die. | On execution | No engine step. | Use the host execution `survives` option. | None | host-choice |
| `professor` [r1775](https://wiki.bloodontheclocktower.com/Professor) | Once per game, at night*, choose a dead player: if they are a Townsfolk, they are resurrected. | Other nights, once per game | Resurrects a dead Townsfolk; marks the ability used even on a miss. | Pick a dead player. | bmr.test.mjs:237 | verified |
| `sailor` [r1768](https://wiki.bloodontheclocktower.com/Sailor) | Each night, choose an alive player: either you or they are drunk until dusk. You can't die. | Every night | Cannot die while sober; stores the drunk recipient; an impaired Sailor loses the protection. | Pick the drunk player. | bmr.test.mjs:375 | verified |
| `tealady` [r1777](https://wiki.bloodontheclocktower.com/Tea_Lady) | If both your alive neighbors are good, they can't die. | Passive | Protects the nearest living neighbours while both are alive and good; an impaired Tea Lady protects nobody. | None. | bmr.test.mjs:341,353,365 | verified |
| `goon` [r2977](https://wiki.bloodontheclocktower.com/Goon) | Each night, the 1st player to choose you with their ability is drunk until dusk. You become their alignment. | Passive | No engine handling. | Track the first chooser, drunk and alignment change manually. | None | unsupported |
| `lunatic` [r3112](https://wiki.bloodontheclocktower.com/Lunatic) | You think you are a Demon, but you are not. The Demon knows who you are & who you choose at night. | First night and other nights | Stores the shown Demon mask; stores the chosen target and shows it to the real Demon in the step note. | Show the false Demon and bluffs; tell the real Demon the choice. | presets.test.mjs:53 | implemented-unverified |
| `moonchild` [r1783](https://wiki.bloodontheclocktower.com/Moonchild) | When you learn that you died, publicly choose 1 alive player. Tonight, if it was a good player, they die. | On death and the next night | Stores the day choice; the next night a good target dies. | Pick a living player after the death. | bmr.test.mjs:285 | verified |
| `tinker` [r1782](https://wiki.bloodontheclocktower.com/Tinker) | You might die at any time. | Other nights | A no-target step; the host may record a death through the outcome controls. | Decide whether the Tinker dies. | None | host-choice |
| `assassin` [r1786](https://wiki.bloodontheclocktower.com/Assassin) | Once per game, at night*, choose a player: they die, even if for some reason they could not. | Other nights, once per game | Kills through every protection except the Zombuul's first death. | Pick the target; once per game. | bmr.test.mjs:175 | verified |
| `devilsadvocate` [r2594](https://wiki.bloodontheclocktower.com/Devil%27s_Advocate) | Each night, choose a living player (different to last night): if executed tomorrow, they don't die. | Every night | Adds an execution-protection effect for the next day; the "different to last night" restriction is not enforced. | Pick a living player. | bmr.test.mjs:253 | verified |
| `godfather` [r2394](https://wiki.bloodontheclocktower.com/Godfather) | You start knowing which Outsiders are in play. If 1 died today, choose a player tonight: they die. [-1 or +1 Outsider] | Setup, first night, and after an Outsider death | Shifts the Outsider count by ±1 and rejects impossible choices; first-night Outsider information; a night kill after an Outsider died today. | Pick the shift and the kill target. | bmr.test.mjs:114 | implemented-unverified |
| `mastermind` [r2993](https://wiki.bloodontheclocktower.com/Mastermind) | If the Demon dies by execution (ending the game), play for 1 more day. If a player is then executed, their team loses. | On a Demon execution | Starts one extra day; the team of the player executed on that day loses. | None. | bmr.test.mjs:205 | verified |
| `po` [r3104](https://wiki.bloodontheclocktower.com/Po) | Each night*, you may choose a player: they die. If your last choice was no-one, choose 3 players tonight. | Other nights | Chooses zero or one target; after a no-target night, exactly three targets. | Pick targets. | bmr.test.mjs:155 | verified |
| `pukka` [r3074](https://wiki.bloodontheclocktower.com/Pukka) | Each night, choose a player: they are poisoned. The previously poisoned player dies then becomes healthy. | Every night, from night one | The host records the previous victim's death and the new target. | Record the delayed death through the outcome controls. | None | implemented-unverified |
| `pukka` [r3074](https://wiki.bloodontheclocktower.com/Pukka) | Each night, choose a player: they are poisoned. The previously poisoned player dies then becomes healthy. | Poison interval | The poison state is not stored; no `poison` effect is created. | Track the poisoned player manually. | None | unsupported |
| `shabaloth` [r1790](https://wiki.bloodontheclocktower.com/Shabaloth) | Each night*, choose 2 players: they die. A dead player you chose last night might be regurgitated. | Other nights | Two kills and an optional resurrection are recorded through the outcome controls; the last targets are stored. | Pick two targets and the regurgitated player. | None | implemented-unverified |
| `zombuul` [r3022](https://wiki.bloodontheclocktower.com/Zombuul) | Each night*, if no-one died today, choose a player: they die. The 1st time you die, you live but register as dead. | Other nights | The first death is replaced and registers as dead; the second death kills; wakes only if nobody died today. | Pick the target. | bmr.test.mjs:190,394,406 | verified |

## Sects & Violets

| Role | Ability (official) | When | Engine behavior | Host decision | Test | Status |
|---|---|---|---|---|---|---|
| `artist` [r3156](https://wiki.bloodontheclocktower.com/Artist) | Once per game, during the day, privately ask the Storyteller any yes/no question. | Day, once per game | No engine step. | Ask and answer the yes/no question at the table. | None | unsupported |
| `clockmaker` [r2967](https://wiki.bloodontheclocktower.com/Clockmaker) | You start knowing how many steps from the Demon to its nearest Minion. | First night | Computes the shortest seat distance from the Demon to the nearest Minion. | None. | snv.test.mjs:110 | verified |
| `dreamer` [r2904](https://wiki.bloodontheclocktower.com/Dreamer) | Each night, choose a player (not yourself or Travellers): you learn 1 good & 1 evil character, 1 of which is correct. | Every night | Creates a step; the host supplies one good and one evil character. | Choose the two characters; false pair when impaired. | None | host-choice |
| `flowergirl` [r2907](https://wiki.bloodontheclocktower.com/Flowergirl) | Each night*, you learn if a Demon voted today. | Other nights | Creates a yes/no step. | Answer whether a Demon voted today. | None | host-choice |
| `juggler` [r2401](https://wiki.bloodontheclocktower.com/Juggler) | On your 1st day, publicly guess up to 5 players' characters. That night, you learn how many you got correct. | First day and that night | The step exists, but `svInfoForStep` returns a hardcoded `0`; the host cannot override it in the step. | Correct the number with a manual correction. | None | implemented-unverified |
| `mathematician` [r3153](https://wiki.bloodontheclocktower.com/Mathematician) | Each night, you learn how many players’ abilities worked abnormally (since dawn) due to another character's ability. | Every night | Creates a note step; the engine does not count abnormal ability workings. | Count and give the number. | None | host-choice |
| `oracle` [r2909](https://wiki.bloodontheclocktower.com/Oracle) | Each night*, you learn how many dead players are evil. | Other nights | Counts dead evil players from `state.deaths`. | None. | None | implemented-unverified |
| `philosopher` [r2421](https://wiki.bloodontheclocktower.com/Philosopher) | Once per game, at night, choose a good character: gain that ability. If this character is in play, they are drunk. | Every night, once per game | Marks the ability used; does not grant the chosen ability or drunk the owner. | Apply the chosen ability and the drunk effect at the table. | None | host-choice |
| `sage` [r3009](https://wiki.bloodontheclocktower.com/Sage) | If the Demon kills you, you learn that it is 1 of 2 players. | After a Demon kill | Appends a conditional information step. | Choose the two players shown. | None | implemented-unverified |
| `savant` [r2910](https://wiki.bloodontheclocktower.com/Savant) | Each day, you may visit the Storyteller to learn 2 things in private: 1 is true & 1 is false. | Day | No engine step. | Answer the two statements, one true and one false. | None | unsupported |
| `seamstress` [r1999](https://wiki.bloodontheclocktower.com/Seamstress) | Once per game, at night, choose 2 players (not yourself): you learn if they are the same alignment. | Other nights, once per game | Chooses two players and computes whether they share an alignment. | Pick the pair. | None | implemented-unverified |
| `snakecharmer` [r2905](https://wiki.bloodontheclocktower.com/Snake_Charmer) | Each night, choose an alive player: a chosen Demon swaps characters & alignments with you & is then poisoned. | Every night | Creates a step and a note; the role and alignment swap is not applied. | Swap the roles and alignments; poison the new Demon. | None | host-choice |
| `towncrier` [r3145](https://wiki.bloodontheclocktower.com/Town_Crier) | Each night*, you learn if a Minion nominated today. | Other nights | Creates a yes/no step. | Answer whether a Minion nominated today. | None | host-choice |
| `barber` [r1757](https://wiki.bloodontheclocktower.com/Barber) | If you died today or tonight, the Demon may choose 2 players (not another Demon) to swap characters. | After a death | Appends a conditional step; the swap is not applied. | Choose two players and swap their characters. | None | host-choice |
| `klutz` [r1758](https://wiki.bloodontheclocktower.com/Klutz) | When you learn that you died, publicly choose 1 alive player: if they are evil, your team loses. | On death | No engine step and no loss condition. | Choose the player; declare the loss when evil. | None | unsupported |
| `mutant` [r1755](https://wiki.bloodontheclocktower.com/Mutant) | If you are “mad” about being an Outsider, you might be executed. | Day | No engine handling and no madness control. | Enforce madness at the table. | None | unsupported |
| `sweetheart` [r2704](https://wiki.bloodontheclocktower.com/Sweetheart) | When you die, 1 player is drunk from now on. | On death | Appends a conditional step and adds a permanent drunk effect to the chosen player. | Choose the drunk player. | None | implemented-unverified |
| `cerenovus` [r3048](https://wiki.bloodontheclocktower.com/Cerenovus) | Each night, choose a player & a good character: they are “mad” they are this character tomorrow, or might be executed. | Every night | Creates a step and a note; madness is not tracked. | Choose the player and the good character; enforce madness. | None | host-choice |
| `eviltwin` [r3101](https://wiki.bloodontheclocktower.com/Evil_Twin) | You & an opposing player know each other. If the good player is executed, evil wins. Good can't win if you both live. | Setup and on execution | Requires a good twin; executing the good twin gives evil the win; good cannot win while both twins live. | Pick the good twin. | snv.test.mjs:119,251; presets.test.mjs:53 | verified |
| `pithag` [r2998](https://wiki.bloodontheclocktower.com/Pit-Hag) | Each night*, choose a player & a character they become (if not in play). If a Demon is made, deaths tonight are arbitrary. | Other nights | Creates a step and a note; character changes are not applied. | Change the character; resolve arbitrary Demon deaths. | None | host-choice |
| `witch` [r2682](https://wiki.bloodontheclocktower.com/Witch) | Each night, choose a player: if they nominate tomorrow, they die. If just 3 players live, you lose this ability. | Every night and next day | Stores a curse on the target; the next nomination kills the nominator but keeps the nomination; the ability is lost at three living; a dead or impaired Witch cannot curse. | Pick the target. | snv.test.mjs:137,162 | verified |
| `fanggu` [r2974](https://wiki.bloodontheclocktower.com/Fang_Gu) | Each night*, choose a player: they die. The 1st Outsider this kills becomes an evil Fang Gu & you die instead. [+1 Outsider] | Setup and other nights | Adds one Outsider; the first Outsider killed becomes an evil Fang Gu and the old Demon dies. | Pick the target. | snv.test.mjs:187 | verified |
| `nodashii` [r3158](https://wiki.bloodontheclocktower.com/No_Dashii) | Each night*, choose a player: they die. Your 2 Townsfolk neighbors are poisoned. | Setup and every night | Poisons the nearest Townsfolk on both sides by character, including dead ones; reconciles on death, role change and source loss. | None. | snv.test.mjs:204,217 | verified |
| `vigormortis` [r3015](https://wiki.bloodontheclocktower.com/Vigormortis) | Each night*, choose a player: they die. Minions you kill keep their ability & poison 1 Townsfolk neighbor. [-1 Outsider] | Setup and other nights | Removes one Outsider; minion ability retention and neighbour poison are not automated. | Resolve minion abilities and poison a Townsfolk for each killed Minion. | snv.test.mjs:86 | host-choice |
| `vortox` [r3017](https://wiki.bloodontheclocktower.com/Vortox) | Each night*, choose a player: they die. Townsfolk abilities yield false info. Each day, if no-one is executed, evil wins. | Passive and end of day | A day with no execution wins for evil; false information is not generated. | Give false information to Townsfolk abilities. | snv.test.mjs:128 | host-choice |

## Cross-cutting rules

| Rule | Engine behavior | Test | Status |
|---|---|---|---|
| Base composition 5–15 | `COMPOSITION` table; Baron, Godfather, Fang Gu and Vigormortis shifts. | `engine.test.mjs:102`; `bmr.test.mjs:114`; `snv.test.mjs:86` | verified |
| Legal random bag | `randomBag` plus `bagErrors`; legal does not mean balanced. | `engine.test.mjs:120,144`; `bmr.test.mjs:103`; `snv.test.mjs:78` | verified |
| Three bluffs at 7+ and none at 5–6 | Bluffs exclude the Drunk mask and roles in play. | `engine.test.mjs:175`; `presets.test.mjs:53,138` | verified |
| Official night order | Scenario sequences in `rules.js`; BMR and S&V sequences are asserted. TB uses the same data without a direct order test. | `bmr.test.mjs:82`; `snv.test.mjs:59`; `night.test.mjs:24,39` | implemented-unverified |
| 5–6 players have no Minion/Demon info | System steps are omitted below seven players. | `engine.test.mjs:175` | verified |
| Conditional wakes | Ravenkeeper after a night death; Undertaker after an execution death; BMR and S&V conditional steps. | `engine.test.mjs:280,299`; `bmr.test.mjs:298,312,285` | verified |
| Dead actors do not wake | `pruneDeadSteps` skips a dead actor except for the listed death-triggered roles. | `engine.test.mjs:897,911` | verified |
| Nomination limits | One nomination per living nominator per day and one per nominee. | None | implemented-unverified |
| Execution threshold | `ceil(living / 2)`, at least half. | `engine.test.mjs:542` | verified |
| Dead vote token | One dead vote, spent on use. | `engine.test.mjs:431` | verified |
| Execution event versus death | An execution can happen without a death. | `engine.test.mjs:475` | verified |
| Win order | Saint, Mastermind, Evil Twin/Vortox, Mayor, no Demon, two alive. | `engine.test.mjs:492,530`; `bmr.test.mjs:205`; `snv.test.mjs:119,128` | verified |
| Idempotent apply | Completed steps and recorded votes reject a second apply. | `engine.test.mjs:565` | verified |
| Uniform Validate/Preview/Apply contract | Domain functions return `{ ok }` but there is no single command contract or preview projection. | None | unsupported |
| Event log and deterministic replay | None; undo is a snapshot ring. | `store.test.mjs:32` | unsupported |
| Recovery in the middle of a step | UI selection state is not persisted; the last saved state is the previous completed step. | None | unsupported |
| Save versioning and migration | Schema v4; v2/v3 migrate on load; corrupt data is backed up. | `store.test.mjs:100,109`; `scripts.test.mjs:173` | verified |
| Import/export validation | Structural validation rejects malformed games without replacing the current one. | `store.test.mjs:43`; `engine.test.mjs:586` | verified |
| Public and player privacy | Public projections omit roles, bluffs, notes and effects. | `engine.test.mjs:586`; browser checks | verified |
| en/ru/az key parity | Matching keys and parameters. | `strings.test.mjs:5` | verified |
| Full translation of role abilities and host text | Catalogs are uneven; role text comes from locale catalogs. | None | implemented-unverified |

## Custom scripts

| Case | Behavior | Test | Status |
|---|---|---|---|
| Official script import | Parses the official JSON formats, keeps `_meta` name and author. | `scripts.test.mjs:53,67` | verified |
| Unknown or unsupported role | Import fails with the role names. | `scripts.test.mjs:80` | verified |
| Traveller in a script | Travellers are collected and ignored for the deal. | `scripts.test.mjs:80` | verified |
| Same-edition custom script | Uses the matching scenario engine. | `scripts.test.mjs:138`; `manual.test.mjs:71` | verified |
| Mixed-edition imported script | Rejected; it does not fall back to manual mode. | `snv.test.mjs:257` | verified |
| Mixed-edition manual pool | Allowed only with `manualOnly: true`; no role or win automation. | `manual.test.mjs:30,63` | verified |
| Jinx interactions | Not modeled; no versioned jinx table. | None | unsupported |
| Unknown character or version conflict | Import rejects it; no silent manual fallback. | `scripts.test.mjs:80` | verified |

## Update procedure

1. Fetch the scenario pages and every role page revision with
   `https://wiki.bloodontheclocktower.com/api.php?action=query&prop=revisions&rvprop=ids|timestamp&format=json&titles=...`.
2. Compare the revision ids with the per-row links. A changed revision needs a
   rules review, not an automatic update.
3. Update the row, its source link and its test in the same change.
4. Never mix a new revision with the pinned `docs/official` snapshot in one
   game. The snapshot is the engine data; the wiki revision is the rule claim.
5. Run `node --test js/*.test.mjs` and the affected route before reporting.

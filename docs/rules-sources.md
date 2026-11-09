# Rules sources

Checked on 2026-11-09 for the Storyteller app, with the Bad Moon Rising
scenario also checked on 2026-11-09. The app implements Trouble Brewing and Bad
Moon Rising. The role catalog and role art come from the existing `assets/data`
and `assets/img` files.

## Primary sources

| Source | What it was used for |
|---|---|
| [Trouble Brewing](https://wiki.bloodontheclocktower.com/Trouble_Brewing) | Role list, team split, beginner guidance. |
| [Setup](https://wiki.bloodontheclocktower.com/Setup) | Player count, secret bag, Baron setup, Drunk, reminder tokens, 5–6 player notes. |
| [Rules Explanation](https://wiki.bloodontheclocktower.com/Rules_Explanation) | Opening speech, public/private talk, death, voting, one dead vote. |
| [Glossary](https://wiki.bloodontheclocktower.com/Glossary) | Exact meanings of alive, dead, execution, poison, drunk, register, neighbour, once per game, win. |
| [States](https://wiki.bloodontheclocktower.com/States) | Drunk and poison behaviour, timing, persistent effects, death ending effects. |
| [Imp](https://wiki.bloodontheclocktower.com/Imp) | Self-kill inheritance, new Imp does not act again that night. |
| [Scarlet Woman](https://wiki.bloodontheclocktower.com/Scarlet_Woman) | Five living immediately before the Demon dies; Travellers do not count. |
| [Mayor](https://wiki.bloodontheclocktower.com/Mayor) | Night redirection to dead, Soldier or Monk-protected targets; three-player win. |
| [Butler](https://wiki.bloodontheclocktower.com/Butler) | Count a vote that was actually cast; the player, not the Storyteller, enforces the master restriction. |
| [Fortune Teller](https://wiki.bloodontheclocktower.com/Fortune_Teller) | Self-selection and dead targets are allowed; the red herring is permanent. |
| [Official resources](https://release.botc.app/resources/) | Canonical app data. |
| [`nightsheet.json`](https://release.botc.app/resources/data/nightsheet.json) | First-night and other-night order. Local snapshot: `docs/official/nightsheet.json`. |
| [`roles.json`](https://release.botc.app/resources/data/roles.json) | Role metadata reference. Local snapshot: `docs/official/roles.json`. |
| [Pocket Grimoire](https://www.pocketgrimoire.co.uk/ru_RU/) | Feature reference only; never used as a rules authority. |

## Night order used by the app

The app follows the official app's `nightsheet.json` order. That order places
the Spy at the end so the Spy sees the final state of the grimoire.

First night: Minion info (7+), Demon info (7+), Poisoner, Washerwoman,
Librarian, Investigator, Chef, Empath, Fortune Teller, Butler, Spy.

Other nights: Poisoner, Monk, Scarlet Woman (passive), Imp, Ravenkeeper, Empath,
Fortune Teller, Undertaker, Butler, Spy.

The Scarlet Woman is not a normal wake. The app resolves her inheritance at the
moment the Demon dies and then inserts a short "Demon changed" confirmation
step. The Ravenkeeper step is inserted only if the Ravenkeeper died that night.
The Undertaker step is inserted only if an execution death happened today.

## Setup and composition

Base counts are the official table:

| Players | Townsfolk | Outsiders | Minions | Demon |
|---:|---:|---:|---:|---:|
| 5 | 3 | 0 | 1 | 1 |
| 6 | 3 | 1 | 1 | 1 |
| 7 | 5 | 0 | 1 | 1 |
| 8 | 5 | 1 | 1 | 1 |
| 9 | 5 | 2 | 1 | 1 |
| 10 | 7 | 0 | 2 | 1 |
| 11 | 7 | 1 | 2 | 1 |
| 12 | 7 | 2 | 2 | 1 |
| 13 | 9 | 0 | 3 | 1 |
| 14 | 9 | 1 | 3 | 1 |
| 15 | 9 | 2 | 3 | 1 |

Baron changes the bag by two: two Townsfolk become two Outsiders. The app
supports the resulting low-Townsfolk compositions, including 1 Townsfolk and
2 Outsiders at five players, but labels random bags as "legal", not "balanced".

## Interpretations that matter in code

1. **5–6 players.** There is no Minion info and no Demon info. The Demon gets no
   three bluffs. Real abilities still work, including the Spy seeing the
   grimoire. The app does not show the "evil team introduction" steps.
2. **Bluffs.** Three distinct good roles not in play. The Drunk's shown role is
   excluded: giving it to the Demon would leak the Drunk mask. Outsiders are
   allowed as bluffs; the UI prefers Townsfolk only as a convention.
3. **Drunk.** `roleId` is always `drunk`; `shownRoleId` is a Townsfolk not in
   play. The player sees only the shown role. The night step follows the shown
   role, but the ability never works. The host may give false information.
4. **Poison.** A Poisoner target is poisoned for that night and the next day.
   The effect ends at the next dusk, when the Poisoner loses the ability, or
   when the Poisoner dies. The app stores source, target, start and expiry, and
   checks the source's live and sober state dynamically.
5. **Monk.** The Monk cannot choose themself. Protection lasts tonight and ends
   at dawn or when the Monk loses the ability or dies. It stops the Demon, not
   executions.
6. **Soldier.** Safe from the Demon's attack while healthy. Poison or drunk
   removes the protection.
7. **Mayor.** A night attack on the healthy Mayor lets the host let the Mayor
   die, or make another player die instead. The replacement may be any other
   player, alive or dead. A dead replacement, a healthy Soldier, or a
   Monk-protected replacement causes no death tonight, and the Mayor remains
   alive. The host is asked only when the Mayor would actually die: a poisoned
   or drunk Mayor has no ability and dies normally, and the Poisoner's poison
   is not an attack, so choosing the Mayor as a poison target never offers a
   redirection. The Mayor wins for good at the end of a day with exactly three
   living players and **no execution event**, even if an execution was
   attempted and nobody died. If a real execution happened, the Mayor does not
   win by this ability.
8. **Saint.** If the Saint dies by execution while the ability works, evil wins.
   Poison or drunk at the moment of execution prevents the loss.
9. **Scarlet Woman.** Living players immediately before the Demon dies must be
   at least five. Travellers do not count. The new Demon does not act again in
   the same night. With fewer than five, the Imp's own self-kill can still pass
   the role to a living Minion; a host choice is required when several Minions
   are eligible.
10. **Virgin.** The trigger is the first nomination of the Virgin. If the
    nominator registers as a Townsfolk, the nominator is executed immediately
    and the day ends. A Drunk, Recluse or Spy (unless the host chooses the Spy
    Townsfolk registration) does not trigger it. The first nomination spends the
    ability even when it does not trigger or the Virgin is impaired.
11. **Slayer.** Once per game, during the day, publicly choose a player. A hit on
    the Demon is a death, not an execution. Using the ability while poisoned or
    drunk spends it and does nothing.
12. **Ravenkeeper.** Wakes only if they died this night. The host shows a
    character. A Spy or Recluse target allows the host to choose a permitted
    registration. If the Ravenkeeper was impaired, the host chooses false
    information.
13. **Undertaker.** Learns the character of a player who died by execution today.
    No execution, or an execution of an already dead player, gives no
    information. A Slayer death is not an execution.
14. **Spy and Recluse.** Registration is a host decision, not a random result.
    The app exposes the allowed variants: Spy may register good and as a
    Townsfolk/Outsider; Recluse may register evil and as a Minion/Demon.
15. **Fortune Teller.** The red herring is permanent. Dead players may be
    chosen, the Fortune Teller may choose themself as one of the two targets,
    and the red herring may be the Fortune Teller themself. The app does not
    restrict any of these choices.
16. **Butler.** The Butler may vote only when the chosen master also votes.
    If the Butler casts a vote illegally, the app counts it and records a
    private host warning, matching the official Storyteller guidance; the
    player, not the Storyteller, is responsible for following the restriction.
    The execution threshold is at least half of the living players:
    `ceil(living / 2)`. Dead votes count toward the tally, not toward the living
    count. It never announces the Butler's role to the table.
17. **Baron.** Changes setup only. Death does not change the composition.
18. **Killed before the wake.** A player killed during the night is skipped
    if their wake is later in the order. The Ravenkeeper is the exception: the
    Ravenkeeper step is inserted after the death. If a Minion becomes the Demon
    mid-night, their old role step (for example, the Spy's grimoire step) is
    skipped.
19. **Spy grimoire.** The host console has a separate full-screen grimoire
    view for the Spy. It shows real roles, reminders and effects, but no notes
    or Demon bluffs. If the Spy is impaired, the host may show a false picture;
    the app does not pretend to generate one.
20. **Win order.** The app resolves Saint, then the end-of-day Mayor check, then
    "no living Demon", then "two living". A dead Demon token alone never ends
    the game before inheritance is resolved.

## Known limitations

- Trouble Brewing and Bad Moon Rising rules are implemented. Sects and Violets
  stays disabled until its roles and rules exist. Custom scripts must be all
  Trouble Brewing or all Bad Moon Rising; mixed editions are rejected.
- Bad Moon Rising is host-adjudicated. The engine does not track Pukka poison,
  Goon alignment or every protection; automated effects and information can
  differ from the true game state, so the host must verify them manually. The
  night/day cards and the BMR secrets screen show this warning.
- Custom scripts can be imported from a JSON file, a URL or the clipboard. URL
  import depends on the host allowing CORS; the app is otherwise offline-first.
- Travellers and Fabled are not part of the setup flow, although the role
  catalog still contains them.
- The app is a local, one-device Storyteller aid. There is no network play and
  no authentication. It is not a security boundary against a player with
  DevTools access to the same browser profile.
- Registration choices are explicit host controls. The app does not invent a
  registration, nor does it try every combination automatically.
- False information is chosen by the host. The app computes the standard result
  and offers allowed alternatives; it does not claim that every alternative is
  equally likely or strategically right.
- Random legal bags are not advertised as balanced. Recommended teaching sets
  exist for 7, 10 and 12 players.
- Live UI catalogs, role guides and help support en/ru/az. Existing narrative
  log records and some teaching-demo narrative retain their original text.
- The Storyteller console records the final execution and the Virgin’s first
  nomination. Ordinary nominations and
  votes are run at the table; the engine keeps vote bookkeeping for tests and
  compatibility, but it is not exposed as a UI ledger.
- Players enter their own names after the deal. New games start with blank
  names; the seat rail uses a placeholder until a name is entered.
- The red herring and all one-of-two pairs are chosen by the host in `/secrets`.
  The production screen does not auto-fill them. Bluffs and the Drunk mask are
  shown as role tokens with names under them. The 10- and 12-player teaching
  sets use Soldier, Virgin and Ravenkeeper as Demon bluffs.
- Export files contain all secrets. The UI warns before export and before
  importing a replacement game.
- The demonstration game is separate from the real saved game and uses the same
  domain functions, but it is a scripted teaching example, not a second engine.


## Bad Moon Rising

Checked on 2026-11-09.

| Source | What it was used for |
|---|---|
| [Bad Moon Rising](https://wiki.bloodontheclocktower.com/Bad_Moon_Rising) | Script roster, teams, setup notes. |
| [Godfather](https://wiki.bloodontheclocktower.com/Godfather) | +1 or -1 Outsider setup; which Outsider died. |
| [Lunatic](https://wiki.bloodontheclocktower.com/Lunatic) | Demon token shown to the Lunatic; Demon kills. |
| [Mastermind](https://wiki.bloodontheclocktower.com/Mastermind) | One extra day after a Demon execution; the executed player's team loses. |
| [Zombuul](https://wiki.bloodontheclocktower.com/Zombuul) | First death is replaced; registers as dead. |
| [Fool](https://wiki.bloodontheclocktower.com/Fool), [Sailor](https://wiki.bloodontheclocktower.com/Sailor), [Tea Lady](https://wiki.bloodontheclocktower.com/Tea_Lady), [Innkeeper](https://wiki.bloodontheclocktower.com/Innkeeper), [Devil's Advocate](https://wiki.bloodontheclocktower.com/Devil%27s_Advocate), [Assassin](https://wiki.bloodontheclocktower.com/Assassin) | Death prevention, protection and bypass ordering. |
| [Po](https://wiki.bloodontheclocktower.com/Po), [Shabaloth](https://wiki.bloodontheclocktower.com/Shabaloth), [Professor](https://wiki.bloodontheclocktower.com/Professor) | Three-target attacks, resurrection, once-per-game flags. |
| [Gossip](https://wiki.bloodontheclocktower.com/Gossip), [Moonchild](https://wiki.bloodontheclocktower.com/Moonchild), [Grandmother](https://wiki.bloodontheclocktower.com/Grandmother), [Chambermaid](https://wiki.bloodontheclocktower.com/Chambermaid) | Conditional wakes and information. |
| [BMR night sheet](https://release.botc.app/resources/data/nightsheet.json) | First-night and other-night order. Local snapshot: `docs/official/nightsheet.json`. |
| [`roles.json`](https://release.botc.app/resources/data/roles.json) | Role metadata and reminder text. Local snapshot: `docs/official/roles.json`. |

### Implementation model

Bad Moon Rising is **host-adjudicated**. The engine owns setup, the official
night order, target ranges, conditional wakes, death/resurrection bookkeeping,
the deterministic protection order, the Minstrel drunk trigger and the
Mastermind extra day. The Storyteller resolves each printed ability and records
deaths and resurrections in the night card's outcome panel.

- Setup: the Godfather shifts the Outsider count by +1 or -1; -1 is rejected
  when the base composition has no Outsider. The Lunatic is shown one Demon
  from the script, stored as `setup.lunaticShownId`; the real Demon knows the
  Lunatic, not the reverse.
- First night: combined Minion/Demon information at the official position,
  then Lunatic, Sailor, Courtier, Godfather, Devil's Advocate, Pukka,
  Grandmother, Chambermaid. The Lunatic sees only its false Demon token.
- Other nights: Sailor, Courtier, Innkeeper, Gambler, Devil's Advocate,
  Lunatic, Exorcist, Zombuul, Pukka, Shabaloth, Po, Assassin, Godfather,
  Gossip, Professor, Tinker, Moonchild, Grandmother, Chambermaid.
- Conditional wakes: Zombuul only if nobody died today; Godfather only after an
  Outsider died; Gossip only after a true statement; Professor and Assassin
  once per game; Grandmother after the Demon kills the grandchild; Moonchild
  after its death and choice; Exorcist skips the chosen Demon's wake.
- Protections: Assassin bypasses Fool, Soldier, Sailor, Tea Lady, Innkeeper and
  Devil's Advocate; Zombuul's first death is replaced even by the Assassin.
  The Devil's Advocate protects against the next day's execution. The Fool's
  first death is prevented and spends the ability. The Zombuul stays alive but
  registers as dead. The Tea Lady protects both neighbours while both are good;
  the Innkeeper protects its two targets for the night; the Sailor cannot die
  while sober and healthy.
- The Minstrel makes every other living player drunk until dusk tomorrow when
  a Minion dies by execution.
- The Mastermind triggers when the Demon dies by execution: the game gets one
  more day instead of ending. If the extra day ends with an execution, that
  player's team loses; otherwise good wins.

### Known limits in this release

- The Pukka's poison is tracked by the Storyteller, not as an engine effect;
  the app records the Pukka's target and the resulting death but does not
  automatically make that player drunk or poisoned for later abilities.
  Automated effects and information can therefore differ from the true game
  state; the BMR night/day cards and secrets screen carry a visible warning,
  and the host must verify them manually.
- The Goon's alignment change, the Courtier's exact three-night drunk window
  and the Sailor's drunk recipient are host choices with partial UI support;
  the engine stores the chosen target and drunk effect where the role step
  provides one.
- The Zombuul's registered-dead state is shown on the table and public screen,
  but the app does not hide its role from Storyteller-only projections.
- Custom scripts must be all-Trouble Brewing or all-Bad Moon Rising; mixed
  editions are rejected. There is no Bad Moon Rising demo or teaching set yet.

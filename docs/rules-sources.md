# Trouble Brewing rules sources

Checked on 2026-11-03 for the Storyteller app. The app implements
Trouble Brewing only. The role catalog and role art still come from the existing
`assets/data` and `assets/img` files.

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
7. **Mayor.** A night attack on the healthy Mayor lets the host choose another
   living player, or let the Mayor die. The Mayor wins for good at the end of a
   day with exactly three living players and **no execution event**, even if an
   execution was attempted and nobody died. If a real execution happened, the
   Mayor does not win by this ability.
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
15. **Fortune Teller.** The red herring is permanent. Dead players may be chosen.
    The app allows the Fortune Teller to choose themself because the printed
    ability does not forbid it; the host may disallow it at the table.
16. **Butler.** The Butler may vote only when the chosen master also votes. The
    app excludes the invalid vote from the tally and shows a private host
    warning. The execution threshold is at least half of the living
    players: `ceil(living / 2)`. Dead votes count toward the tally, not
    toward the living count. It never announces the Butler's role to the table.
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

- Only Trouble Brewing is supported. Travellers and Fabled are not part of the
  setup flow, although the role catalog still contains them.
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
- Some text in the new host screens is Russian-first. Role names, abilities and
  the old catalog translations still follow the language switch (en/ru/az).
- The Storyteller console records only the final execution. Nominations and
  votes are run at the table; the engine keeps vote bookkeeping for tests and
  compatibility, but it is not exposed as a UI ledger.
- Players enter their own names after the deal. New games start with blank
  names; the seat rail uses a placeholder until a name is entered.
- The red herring and all one-of-two pairs are chosen by the host in `#/secrets`.
  The production screen does not auto-fill them. Bluffs and the Drunk mask are
  shown as role tokens with names under them. The 10- and 12-player teaching
  sets use Soldier, Virgin and Ravenkeeper as Demon bluffs.
- Export files contain all secrets. The UI warns before export and before
  importing a replacement game.
- The demonstration game is separate from the real saved game and uses the same
  domain functions, but it is a scripted teaching example, not a second engine.

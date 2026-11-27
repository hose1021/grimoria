# Design

## The rules

- Mayor r2995: "If you die at night, another player might die instead." The
  Storyteller decides whether and who.
- Imp r3116, "How to Run": "If the Imp killed themself at night, choose an
  alive Minion and replace their character token with a spare Imp token [...]
  Wake the new Imp". The choice comes first.
- Chef r2510, Example 4: a player who may register either way does so for each
  pair on its own, so the Storyteller picks the count among the legal ones.
- `AGENTS.md`: never auto-fill a Storyteller decision (false info, Spy/Recluse
  registration, Mayor redirect, Demon heir); offer the allowed options with
  the reason.

Rules check: compliant. The table now offers the Mayor's fate and the heir and
picks neither, and names a registration choice as one.

## Where the defects were

1. `selectSeat` (`src/ui/screens/table/index.tsx`) wrote the redirect draft
   `"none"` whenever the new target needed a redirect and no draft existed.
   The completion gate (`stepContext`, `needsRedirect`) then saw an answer.
2. `TableDock`, `TableRing` and `StepSheet` read `tableProjection(state).step`,
   the engine's next open step, and ignored `pendingDemonChange`. Only
   `NightCard`, inside the step sheet, checked for the heir, and the sheet
   kept the Empath's skip and confirm under it.
3. `GivenSelect` (`cards.tsx`) chose the label from the answer's shape:
   `registration` only for a character, `ui.hostAnswer` for a missing source,
   `falseInfo` for everything else.

## Decisions

### No answer from a seat tap

The draft is no longer written. Changing the victim still drops the draft, so
an answer given for an earlier victim never carries over. The gate and the
select already treat a missing draft as unanswered, so nothing else changes.

### The heir is the night's prompt

`TableDock` and `TableRing` set their step to none while the heir is owed. The
dock then names the question, shows its text as the hint and offers the
Minions through `HeirChoice`, the component `NightCard` used. The ring names
the question in its centre, marks no seat as acting and offers no target. A
seat tap opens the player's correction, as on a step without targets.
`StepSheet` shows only the question. The dock opens no sheet while the heir
is owed, but a sheet that is already open when another window records the
Imp's self-kill stays open: the store adopts another window's save when this
window has nothing pending (`create-game-store.ts`). The sheet then asks only
for the heir.

The engine is not changed. It still accepts a command for a later step while
the heir is owed (see Limitations).

### The label follows the reason

`givenLabelKey` in `helpers.ts` returns the locale key from the answer's
reason alone, not from its shape. An impaired actor gives `falseInfo`, also
when the source is missing. A missing source gives `ui.hostAnswer`. A Vortox
(`falsifiedSuffix`) gives `falseInfo`. Anything else is a choice a working
ability offers only through a registration, so it gives `registration`. That
is the case `moduleInfoForStep` builds when the legal answers are more than
one, and it keeps the healthy Undertaker's and Ravenkeeper's character a
registration. No character answer has a missing source or a Vortox today
(`sv.ts` marks only number, yes-no and note answers), so every label that was
right before stays the same.

## Proof

- **RED first.** The four new focused browser checks fail on main
  `205f55c`: the dock does not ask for the Mayor's fate, the dock names the
  Fortune Teller instead of the heir, an open sheet offers the Fortune
  Teller's skip under the heir question, and the Chef's select is labelled
  false information. The unit test fails with main's label logic moved into
  `givenLabelKey` unchanged.
- **Mutations.** Each fix reverted alone makes its check fail (`tasks.md`).
- **The full browser run and the scenarios** pass, including the Mayor checks
  of the full run, whose retarget assertion now expects an unanswered select.

## Limitations

- The engine accepts `completeNightStep` and `skipStep` for a later step while
  the heir is owed. The table no longer offers them, but another client could
  send them. Refusing them is an engine change that needs a ruleset version
  for recorded commands.
- At 390 px the centre of the table truncates the heir question to its
  190 px box, and with ten seats the text runs over the name labels of the
  two seats at its height, as any centre title of that width does. The dock
  below carries the whole question and the choices.
- The Chef's step sheet now shows two "Registration" headings when a Spy or
  Recluse can be set per player: the registration toggles and the count.
  Both are registration decisions.

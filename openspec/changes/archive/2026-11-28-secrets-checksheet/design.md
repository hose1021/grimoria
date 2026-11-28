# Design

## Context

See `proposal.md`. `/secrets` is a setup route rendered by
`src/ui/screens/secrets.tsx` inside `SetupShell`. The store publishes one
snapshot; every answer is a command (`setSetupInfo`, `setHerring`,
`normalizeSecrets`, `startNight`). `secretsErrors` owns legality: the red herring
must be a good player, every pair must name a role in play and two different
players, the Librarian's zero is legal only while every Outsider is a Recluse,
and the Drunk's false pair must match the shown role's type.

The incumbent markup is three rails: a phase card and reminders, a stage with
the herring, three equal pair editors and the roster, and a readiness rail. Its
headings, status words and step chips are literal Russian, so `en` and `az`
show Russian copy there.

## Goals / Non-Goals

**Goals:**

- One obligation open at a time, with the index carrying what is done.
- The one-of-two answer read and edited as the rule's sentence.
- Readiness and the single start action in a pinned footer.
- All copy through `t()`, with the new keys in `ru`, `en` and `az`.
- The BMR and S&V briefings share the page head, error band and footer.

**Non-Goals:**

- Any engine, command, projection or state change.
- Auto-filling a pair, the zero or the red herring.
- A new visual world, palette or control system. The route keeps the Arcane
  Instrument materials in `css/app.css`.
- Geometry or content of the table, bag and seat routes.

## Decisions

**The index is the checksheet's spine.** The left column lists every obligation
the script needs: the red herring when a real Fortune Teller is in play, one
item for each information role in play, and the Drunk's shown role when it is an
information role. Each item shows a word and a mark (`✓ готово` / `○ выбрать`),
so state is never colour alone; the phone shows the mark alone with the state in
the button's accessible name, so the chips stay compact. The right pane opens
one item and sizes to its content, so the open obligation reads as one sheet,
not as a half-empty box. Alternative considered: keep the three rails and
restyle each editor; rejected because the equal weight of the editors is the
reported problem, and a rail that lists readiness duplicates the error band.

**Answered state is structural, legality stays in the engine.** The index marks
an item answered when the stored record has a role and two distinct players, or
the Librarian's zero. It does not re-implement the rule checks: `secretsErrors`
still decides whether the route may start, the error band lists its problems,
and the start action stays disabled until it is empty. Alternative considered:
derive the mark from error codes; rejected because the codes are validation
detail and a new code would silently change the index.

**The pair is a sentence, not three labelled fields.** The editor reads «Один из
[игрок] и [игрок] — [персонаж]» with three native selects in the sentence. The
sentence states the rule's shape once and makes the missing slot visible. The
selects carry `aria-label`s (`ui.player1`, `ui.player2`, `roleInPlay`), keep the
engine's option builders (`infoRoleChoices`, `librarianZeroLegal`), and keep the
`data-info-role`, `data-player`, `data-info-zero` hooks. Alternative considered:
labelled fields in a grid; rejected because it restores the identical-form
problem and hides which slot the rule asks for. At 390 px each select takes the
full row, so the sentence becomes a readable stack instead of orphaned words.

**The red herring is its own obligation.** When a Fortune Teller is in play, the
index opens a pane whose sentence is «Гадалка видит демона в [игрок]» and whose
options are the good players. It keeps `data-herring` and the `setHerring`
command. Alternative considered: keep it as a card above the pairs; rejected
because it is one more equally weighted box and it is an obligation like the
pairs.

**Reminders and roster are checks, not choices.** They live in the same index
under a separate group, without a done mark, because the engine does not require
them. The reminder list keeps `data-reminders` and the role art cards; the
roster keeps the warning and the seat/role/shown-role rows.

**The footer carries readiness and one action.** It names `{done} из {total}`
when every answer is valid and the first problem, in the error tone, when one is
not; the index header still carries the count. It shows exactly one primary
action: names first, then seats, then the first night, exactly the incumbent
gate. On a phone the error band above the stage is hidden and the footer owns
the reason, so the first control of the open obligation clears the sticky dock
at first paint; the desktop keeps the full band. The BMR and S&V branches keep
their facts, a quiet bag link and their start action in the same footer.

**The missing slot carries the accent.** An unanswered select —
player, character or red herring — wears `border-amber ring-1 ring-amber/40`;
an answered one returns to the neutral field border. The active index item is a
neutral `bg-selected` fill, so the screen keeps one accent and it points at the
answer, not at the tab. This is the contract's memorable moment and it also
lifts the empty control's boundary above the 3:1 non-text floor.

**The phone index wraps instead of scrolling.** The index becomes a wrapping row
of chips (`flex-wrap`) so every control stays inside the viewport; a horizontal
scroller would fail the browser check's "controls outside the viewport" rule and
hide obligations. The footer stays sticky at the bottom.

**The regression harness opens obligations.** `fillPhoneSecrets` iterates
`[data-obligation]`, clicks the item, fills the open `.secrets-info` through its
`h2`, then opens the herring pane and fills `select[data-herring]`. This keeps
the walkthrough's coverage: every pair is answered, the legal status appears and
the start action is clicked.

## Risks / Trade-offs

- **One pane hides the other obligations.** → the index carries each state and
  the count, and the next unanswered item opens by default.
- **A sentence editor is harder to scan than labelled fields.** → the sentence
  is one line on desktop, the select options name the player, seat and role, and
  the hint repeats the rule.
- **The inline selects shrink the touch target.** → every select keeps the
  `.field` primitive's 44 px height and full width on phones.
- **The index can grow on a phone with many information roles.** → chips wrap
  and stay 44 px; the pane follows the index and the footer stays pinned.
- **The harness change can mask a broken flow.** → the walkthrough still fills
  through the same selectors and asserts `.secrets-status.is-ok` and the start
  action; no assertion is removed.

## Open Questions

None.

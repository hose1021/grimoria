# Design

## The flow and the first divergence

The engine path was correct:

1. `moduleInfoForStep` reads the prepared record
   `{ roleId: "chef", pair: ["6", "5"] }` from setup.
2. A healthy answer is `{ kind: "one-of-two", roleId, pair, matchIndex,
   needsChoice: false }`.
3. An impaired answer keeps the prepared record, sets `impaired: true`,
   `needsChoice: true` and offers every Trouble Brewing Townsfolk. The host may
   repeat the true answer.
4. `completeNightStep` stores `step.given` and `finishStep` marks the step
   `impaired`; the journal entry carries the host choice and its detail.

The state was therefore consistent through preview, apply and replay. The
first layer that diverged was the console draft:

- `StepSheet` rendered the role select from `drafts.givens` and the template
  from `drafts.infoTemplate`.
- `PlayerInfoCard` read `drafts.givens.get(...) || derived.info` and passed
  `drafts.infoTemplate` as a fallback for an impaired actor.
- `shownCardText` preferred `givens` over the template.
- The confirm payload used `context.payload`, which contained only `givens`.

Typing the template and then choosing a role produced three answers: the card
showed the role, the command sent the role, and the template was dropped. The
second divergence was downstream: `describeGiven` checked `pair` before
`roleId` and resolved names only for `player-pair`, so the journal printed
`6 / 5` and lost the character.

## One answer record

`InfoResult` gains `answerText?: string`. It belongs to the answer, not to the
step or the screen, for the same reason the engine stores the pair and the
match index together: the journal and the card must read the answer the player
heard.

- The template control writes `answerText` on `drafts.givens.get(key) || info`
  and sets `needsChoice: false`.
- `applyGiven` spreads its input, so choosing a role after typing keeps the
  wording, and choosing a value after typing keeps it too.
- `infoPayload` already serializes every field of the draft, so the command
  carries `answerText` without a payload change.
- `step-draft.ts` accepts the field when it restores a draft.
- `infoText` returns `answerText` first. A note answer keeps its own `text`
  contract; the template is not shown for a note because the note textarea is
  already the answer.

## Card source

The card uses `draftGiven || step.given || derived.info` as its display record
and the same first two as its `given` argument. `shownCardText` for an impaired
actor returns the given or `ui.notSet`, never `derived.info`, so a cleared
draft cannot expose the engine's prepared answer or the poisoning fact. The
impaired flag is the live projection, the step's recorded `impaired`, or the
recorded answer's own flag: a completed step keeps the privacy decision of the
moment it ran.

The card control is enabled whenever that `given` exists. A chosen role or
value is an answer by itself; the host does not have to type a wording to open
the card. When a wording exists the control reads as showing the template,
otherwise as showing the card.

For a one-of-two answer that asks the host, two player selects sit beside the
role select. They write the pair into the same draft, so the card, the command
and the journal read the pair the Storyteller chose rather than the prepared
one. A healthy answer has no such controls: its pair is prepared.

## Draft lifetime

The draft key already contains the step key, so a new step starts empty. The
remaining gaps were inside one step:

- `clearStep` dropped only the Bad Moon Rising maps. It now drops the targets,
  the redirect, the registrations and the given too.
- `selectSeat` dropped only the redirect. It now drops the given and the
  registrations on every target click: the old answer was tuned to the old
  choice.

The template state disappears with the separate draft, so there is no
step-independent string left to leak into the next step.

## Validation

`givenIsLegal` gets an optional state, a ruleset version and a one-of-two
branch:

- `zero` is legal only when the info is the zero record and, for a question,
  the options list contains `"zero"`;
- a role answer is legal when it is in the offered options, or, for a working
  ability, when it equals the prepared role;
- the pair is required: it must have two different ids, both must resolve to a
  player, and, for a working ability, it must be the prepared pair as a set.

`validateGiven` calls it for every supplied one-of-two answer, not only when
the step offered options.

## Version

The old check accepted an answer with the right role and no pair, and any
answer to a working ability. A journal recorded before #344 can contain such a
command under `tb-bmr-snv-2026-11-19`. Running the new check on it would refuse
the replay, so the full check starts at `tb-bmr-snv-2026-11-20.1`:

- `validatesOneOfTwoAnswer(version)` is true for the current version and for a
  direct call without one;
- every earlier supported version keeps the role-only check;
- the new version joins the "current behavior" lists of the Dreamer/Sage pair,
  the attack source and the mandatory-skip rule.

A test applies a different healthy answer under `tb-bmr-snv-2026-11-19`,
replays the journal and compares the full state, so the gate is observed rather
than assumed.

## Journal

`describeGiven` returns `answerText` when present. Otherwise a one-of-two answer
becomes `<role id>: <player name> / <player name>`; `frame.tsx` localizes the
leading role id for the console language. A player pair keeps its existing
name-only detail. Old lines without a role prefix and without `answerText` are
left as they were, so the existing legacy fixtures do not change.

## Not in this change

- The separate template for a non-structured note answer.
- A general redesign of every host answer: the engine still accepts a
  registration-shaped number or a note without a full audit.
- The `/secrets` obligation check marks (issue #324).

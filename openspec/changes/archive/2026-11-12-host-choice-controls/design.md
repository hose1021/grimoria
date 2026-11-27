# Design

## Context

The engine already computes the legal options for a discretionary step and
returns them through `infoForStep`; `completeStep` refuses a choice step with no
`given` answer. What it did not do is check that the answer was one of the
options, and it accepted any registration for any player. The journal recorded
the completed step but not the choice as a named case with its reason.

## Decisions

### One closed case list

`HOST_CHOICE_CASES` names the twelve discretionary cases. Each has one
Storyteller-facing reason in `HOST_CHOICE_REASONS`. A case is derived from the
step (`caseForStep`), so a role with a specialised reason (Dreamer pair,
Flowergirl, Town Crier, Mathematician, Cerenovus) is named precisely, and every
other information answer is `false-information`.

The list is closed so the screen and the journal cannot invent a case tag that
no reason explains; the tests assert a reason for every entry.

### The answer must be an offered option

`givenIsLegal` compares the answer with `info.options` by kind: a `role-pair`
joins its two ids with `|`, a number must be listed, a yes/no must be listed, a
character must be listed. A free-form case (a note, a text announcement) has no
option list and passes, because the engine cannot enumerate it and the host is
the only source of truth there.

`completeStep` applies this check in the Sects and Violets branch and in the
Trouble Brewing information roles. A rejected answer returns `error.66` with
`needsChoice` and the same options, so the step stays open and the host can
retry. The Bad Moon Rising branch keeps free-form answers: its steps accept
narration, and restricting them would break legal official cases.

### Registration is a constrained override

Only the Spy and the Recluse can register differently. `legalRegistrations`
lists exactly the values the information functions read: the Spy may be
`good`, `townsfolk` or `outsider`; the Recluse may be `evil`, `demon` or
`minion`. `registrationError` rejects any other player or value with
`error.67` before the step mutates, so a rejected registration leaves no partial
state.

### The journal records the choice

An accepted answer appends one secret `choice` line through `recordHostChoice`:
the case reason as the title, the chosen value as the detail, the case id in
`case`, and the acting player when there is one. `LogEntry` gained an optional
`case` field for this; no schema version changes because the field is additive.

### No leak

The public and player projections are unchanged; the new journal line is
`secret: true`, and the tests assert that neither projection carries a case,
reason, journal or hidden role.

## Risks

- A stricter answer check can reject a host who types a free-form answer where
  the engine offers options. That is intended: the options are the official
  legal answers. Free-form steps are exempt.
- A test helper that answered outside the options had to be corrected
  (`falseInfo` in `js/snv.test.mjs` now picks an offered value); this is a
  contract fix, not a weakened assertion.

## Verification

`js/host-choice.test.mjs` covers the case list and reasons, an illegal answer,
a legal recorded answer, a registration for another character, an unread
registration value and a legal Spy override that changes the information. The
full suite (`npm test`), `npm run verify`, the OpenSpec checks and
`git diff --check` run before the handoff.

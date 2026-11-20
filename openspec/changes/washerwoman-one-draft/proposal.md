# One draft for the Washerwoman's prepared answer

Issue: #217

## Why

A poisoned Washerwoman's step offered two independent answers: a role select
and a free-text template. The step sheet previewed the role, the private card
preferred whichever draft was set, and the command sent only the role. Typing
a template and then choosing a role lost the template: the card showed the
role sentence while the command recorded the role, and the template never
reached the journal.

A completed step had no card fallback: the card read the draft map and the
engine's computed answer, never the `given` record the engine stored. The
journal for a one-of-two answer printed only the two player ids (`6 / 5`), so
the character was lost and the ids were unreadable.

The command path accepted a pair with the same player twice or an unknown
player id, because `givenIsLegal` checked only the role. A healthy
Washerwoman's prepared answer could be replaced by any answer a client sent,
because the check ran only when the step offered options.

## What changes

- A recorded information answer gains `answerText`: the Storyteller's own
  wording of what the player hears. It is part of the same `given` draft as the
  role, the two players and the value, and it is stored in `step.given` and
  replayed from the journal.
- The template control writes that field into the step's `givens` draft
  instead of a separate, step-independent template string. The select keeps an
  existing wording when the host later chooses a role.
- The private card reads the draft first and the recorded `step.given` second,
  so it previews the command's own answer and still shows it after the draft
  is cleared. The card control is offered whenever the step holds an answer,
  including a chosen role or value with no separate wording. An impaired card
  never falls back to the engine's computed answer and never states that the
  actor is poisoned.
- A false one-of-two answer offers two player selects beside the role select,
  so the Storyteller can name a pair other than the prepared one; the pair is
  part of the same `given` draft as the role and the wording.
- `clearStep` clears targets, redirects, registrations and the given with the
  Bad Moon Rising drafts. A target change drops the given and the
  registrations, because a new choice answers a new question.
- `givenIsLegal` validates a one-of-two answer as a whole: the role is one the
  step offered, the pair is two different players that exist in the state, and
  a working ability accepts only its prepared role and pair. A missing pair is
  incomplete and is refused. Zero stays legal only where the role declares it
  and the step offers it.
- `tb-bmr-snv-2026-11-20.1` is the first ruleset version with that full check. A
  command recorded before it keeps the role-only check, so a journal that a
  pre-#344 build accepted still replays.
- `describeGiven` journals a one-of-two answer as `<role id>: <player> / <player>`
  and shows the Storyteller's wording when there is one. The console names the
  role in its own language, as it already does for a checked pair.

## Impact

No storage key, schema, command payload shape or ruleset version changes. An
old journal replays as written: a recorded zero answer and a recorded prepared
pair still pass the new checks, and the old `6 / 5` journal lines are rendered
unchanged because they have no `answerText` and no role prefix to localize.

The healthy answer is now the prepared record even when a client sends the
same answer; a different answer is refused with `error.66`. This closes the
command path to a replacement the table never offered.

The card, the step sheet and the command now read one draft. The rule itself is
unchanged: a healthy Washerwoman learns that one of two players is a particular
Townsfolk; a drunk or poisoned one has no ability and may be shown false
information (Washerwoman r2630; States r1039).

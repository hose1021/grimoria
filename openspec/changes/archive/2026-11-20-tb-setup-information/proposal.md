# Trouble Brewing information roles as capabilities: Washerwoman, Librarian and Investigator

Issue: #200

## Why

The Washerwoman, the Librarian and the Investigator are still answered by one
branch of `infoForStep` in `information.ts`. It names the three roles, maps
each to its character type twice, and writes the record of the step. `night.ts`
names them in the table of answer shapes and in the gate of the step
completion. The modules declare an empty step and nothing else.

The three roles share one rule sentence with a different character type: "You
start knowing that 1 of 2 players is a particular Townsfolk" (Washerwoman
r2630), Outsider (Librarian r1721) or Minion (Investigator r2983). They also
share one answer: the Storyteller chooses it "while preparing the first
night", and the app keeps that choice in setup. The record has one writer, so
the three roles move in one pull request. This change continues ADR 0002
slice 2, "Night steps: Trouble Brewing remainder", after
`tb-character-information`.

## What changes

- The three modules declare their step on the `night-step` arm: the first
  night only, the `one-of-two` shape, no resolver.
- The `information` capability gains one decision, `prepared`: the answer is
  the one the Storyteller prepared in setup, and the role names every
  character it can show. The Washerwoman names every Townsfolk, the Librarian
  every Outsider and the Investigator every Minion.
- `moduleInfoForStep` reads the prepared record under the role's id and writes
  the record of the step: the character, the two players and the Storyteller's
  mark of the real one; a request for setup while nothing is prepared; the
  default false answer of a Drunk that has no record at all; and the zero. An
  impaired owner is offered the characters the role names.
- `infoForStep` and the step completion no longer name the three roles: the
  branch of `infoForStep`, the three entries of `infoKindFor` and the three
  names in the completion gate are removed.
- `docs/role-ownership.md`: the three rows declare `capability:night-step` and
  `capability:information` and keep only their references in `setup.ts`.
- The Librarian's `rule.md` cited a test name that no longer exists; it now
  cites the tests that run.

## What stays

- **Setup.** The check of a prepared answer (`secretsErrors`), the automatic
  choice (`autoSecrets`, `normalizeSecrets`) and the command that edits it
  (`setSetupInfo`) still name the three roles and their types. That is setup
  and not a night step, as with the Fortune Teller's red herring.
- **The zero.** "Or that zero are in play" is the Librarian's rule, but the
  engine wrote the zero record for whichever of the three steps found a zero
  prepared, with the Outsider options and sentences. The night start refuses a
  zero for a Washerwoman or an Investigator; a zero written by a command after
  the night began is still answered that way. Giving the zero to the
  Librarian's module alone would change that, so the record stays in the
  engine, role-agnostic as before, and is listed under Limitations.
- **The role sees no setup secret.** The context gains no fact. The compile
  check that the information context exposes no setup secrets stays, and a
  second one says it exposes no prepared answer.

## Impact

Behavior is unchanged. The step, the stored answer and its key order, the
request for setup and its error code, the zero records and their texts, the
default of a Drunk without a record, the host question and its options, the
journaled false information, the command events and the order of draws from
the command ports stay the same, so saved games and journals replay as before.
No storage, command payload, schema or pin changes.

The Empath, the Fortune Teller, the Chef, the Undertaker and the Ravenkeeper
do not return the new decision; their answers are unchanged.

The Spy is the last Trouble Brewing role with a branch in `infoForStep` and
is not part of this change.

# Trouble Brewing information roles as capabilities: Undertaker and Ravenkeeper

Issue: #200

## Why

The Undertaker's and the Ravenkeeper's answers are still computed in the
engine. Two branches of `infoForStep` in `information.ts` read the death by
execution of the day and the player the Ravenkeeper chose, list the characters
the host may show and write the record of the step. `night.ts` names both
roles in the table of answer shapes and holds one branch of the step
completion for each. The modules declare who wakes and nothing about the
answer.

Both roles learn the character of one player, and both write the same record:
the character, the player and the characters the host is offered. They are
also the two roles to which a Spy or a Recluse may register as another
character (Undertaker r3115, Example 3; Ravenkeeper r3125, Example 2). The
record has one writer in the engine, so the two roles move in one pull
request. This change continues ADR 0002 slice 2, "Night steps: Trouble
Brewing remainder", after `tb-chef-information`.

## What changes

- The Undertaker and the Ravenkeeper answer through an `information`
  capability. The Undertaker gives the character recorded at the death by
  execution today; the Ravenkeeper gives the character of the first chosen
  player. Both name every character as the possible answers and the
  characters the player may register as as the legal ones.
- The information context gains two read-only facts: who died by execution
  today, with the character recorded at the death, and the characters a
  player may register as to this ability.
- The `answer` decision gains `subjectId`, the player the answer is about.
  The `information` capability gains the `note` decision: the ability has
  nothing to learn and the text says why.
- `moduleInfoForStep` writes the character record for a step whose declared
  shape is `character`, stores a note as the answer of the step, and keeps the
  question with every character for a character step that has no player to
  read yet.
- `infoForStep` and the step completion no longer name the two roles: both
  branches of `infoForStep`, both entries of `infoKindFor` and both completion
  branches are removed. The steps declare the `character` shape themselves.
- `docs/role-ownership.md`: the Undertaker row declares `nightStep` and
  `capability:information` and has no engine reference. The Ravenkeeper row
  declares the same and keeps four references in `night.ts`, all of the step
  appended on the night of its death.

## What stays

- Who wakes. The Undertaker's step exists only after a death by execution and
  the Ravenkeeper's is appended on the night it dies. Both are still declared
  in the legacy `nightStep` field, whose `actor` and `extra` hooks read the
  game. A capability never receives the game state (ADR 0002), so the wake
  cannot move before a contract for conditional wakes exists; that belongs to
  ADR slice 6, with the other steps a death causes.
- `characterChoices` stays exported. The engine answers the new fact with it,
  and the table's read model and one scenario call it.

## Impact

Behavior is unchanged. The step, the stored answer and its key order, the
secret log lines and their order, the journaled registration ambiguity and
false information, the host question and its options for a Spy or a Recluse
and for an impaired owner, the error codes, the command events and the order
of draws from the command ports stay the same, so saved games and journals
replay as before. No storage, command payload, schema or pin changes.

One difference exists only for a state the setup refuses: a seat or a death
record without a character. The engine used to write a character record with
no character for it; the roles now return no answer, and the step keeps the
question with every character.

The Empath, the Fortune Teller and the Chef read neither new fact and return
neither new field; their answers are unchanged.

The registration label of the table and the remaining Trouble Brewing
information roles (Washerwoman, Librarian, Investigator, Spy) are not part of
this change.

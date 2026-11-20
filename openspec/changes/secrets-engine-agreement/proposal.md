# Proposal

Issue: #324

## Why

Two `/secrets` surfaces disagreed with the engine:

- The obligation tick checked that a role and two distinct players were
  present. It ignored the team, whether the role is in play, whether a
  registering player is in the pair and whether the Librarian's zero is legal,
  so a row could show done while the start gate reported an error.
- The role selector offered the not-in-play characters whenever any Spy or
  Recluse was in play. The engine accepts such a character only while the
  registering player is one of the two chosen players, so the screen offered an
  answer the engine then rejected.

## What changes

- `obligationDone(id, problems)` derives the tick from the engine's
  `secretsErrors`; the seat, the herring and each information role use it.
- `infoRoleChoices` takes the roles of the chosen pair instead of a global flag,
  so the not-in-play options follow the pair.

## What stays

- The engine rule and the command payloads.
- The Librarian zero, the Drunk mask and the reminder checklist logic.

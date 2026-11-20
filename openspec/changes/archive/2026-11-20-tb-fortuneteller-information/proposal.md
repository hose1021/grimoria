# Trouble Brewing information roles as capabilities: Fortune Teller

Issue: #200

## Why

The Fortune Teller's answer is still computed in the engine.
`fortuneTellerYes` in `information.ts` holds the rule (yes for the red herring
or for a player who registers as a Demon), `infoForStep` has a Fortune Teller
branch that fixes the shape of the answer and lists the answers offered to the
host, and `night.ts` names the role in the table of answer shapes and in the
gate of the step completion. The module declares only that the step takes two
players.

`tb-empath-information` gave the engine one path for a role that owns its
answer. This change moves the second Trouble Brewing information role onto it.
It is the next pull request of ADR 0002 slice 2, "Night steps: Trouble Brewing
remainder".

## What changes

- The information context gains two read-only facts: whether a player
  registers as a Demon to this ability, and which player is the red herring.
- The Fortune Teller declares its step through the `night-step` capability for
  every night, with two players and the yes-or-no shape, and answers through
  an `information` capability: yes when either chosen player is the red
  herring or registers as a Demon, with yes and no as the possible answers.
- `infoForStep` and the step completion no longer name the role: the branch,
  the table entry and the gate entry are removed.
- `fortuneTellerYes` stays exported as a query. It now hands the engine's
  facts to the role module and holds no rule of its own.
- `docs/role-ownership.md`: the Fortune Teller row declares
  `capability:night-step` and `capability:information`. It keeps three
  references in `setup.ts`, where the red herring is checked and chosen, and
  one in `information.ts` for the query. The reference in `night.ts` is gone.

## Impact

Behavior is unchanged. The step, the stored answer and its key order, the
secret log lines and their order, the journaled registration and false
information, the host question and its options, the error codes for a step
without two different players and for an answer that was not offered, the
command events and the order of draws from the command ports stay the same, so
saved games and journals replay as before. No storage, command payload, schema
or pin changes.

The Empath's answer does not read the two new facts and is unchanged.

The red herring's setup in `setup.ts` and the secrets screen, the registration
prompt of the table and the remaining Trouble Brewing information roles (Chef,
Undertaker, Ravenkeeper, Washerwoman, Librarian, Investigator, Spy) are not
part of this change.

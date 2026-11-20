# Trouble Brewing information roles as capabilities: Chef

Issue: #200

## Why

The Chef's answer is still computed in the engine. `chefCount` in
`information.ts` counts the pairs of neighbouring evil players,
`chefRegistrationRange` computes which counts are legal when a Spy or a
Recluse sits beside an evil player, the Chef branch of `infoForStep` fixes the
shape of the answer and lists what the host is offered, and `night.ts` names
the role in the table of answer shapes and in the gate of the step completion.
The module declares an empty step.

`tb-empath-information` gave the engine one path for a role that owns its
answer, and `tb-fortuneteller-information` moved the second role onto it. The
Chef is the first role whose working ability can need the host: a Spy or a
Recluse may register differently for each pair of one query (Chef r2510,
Example 4), so more than one count can be true. This change is the next pull
request of ADR 0002 slice 2, "Night steps: Trouble Brewing remainder".

## What changes

- The `answer` decision of the `information` capability gains `legal`: every
  value a working ability may show when the answer depends on how a player
  registers. For a working ability with more than one legal value the engine
  asks the host and offers them; an impaired owner is still offered every
  possible value.
- The information context gains two read-only facts: the seats in order around
  the circle, and whether a player may register as a team to this ability.
- The Chef declares its step through the `night-step` capability for the first
  night, with no target and the number shape, and answers through an
  `information` capability: the count of neighbouring pairs that register as
  evil, every number up to the seat count as the possible answers, and the
  range from the pairs that cannot be avoided to the pairs that can be made as
  the legal ones.
- `infoForStep` and the step completion no longer name the role: the branch,
  the table entry and the gate entry are removed, and so are
  `chefRegistrationRange` and the unused `uniqueNumbers`.
- `chefCount` stays exported as a query. It now hands the engine's facts to
  the role module and holds no rule of its own.
- `docs/role-ownership.md`: the Chef row declares `capability:night-step` and
  `capability:information` and keeps one reference in `information.ts` for the
  query. The reference in `night.ts` is gone.

## Impact

Behavior is unchanged. The step, the stored answer and its key order, the
secret log lines and their order, the journaled registration, registration
ambiguity and false information, the host question and its options for a
registration range and for an impaired Chef, the error code for an answer that
was not offered, the command events and the order of draws from the command
ports stay the same, so saved games and journals replay as before. No storage,
command payload, schema or pin changes.

The Empath and the Fortune Teller name no legal values and read neither new
fact; their answers are unchanged.

The registration prompt of the table and the remaining Trouble Brewing
information roles (Undertaker, Ravenkeeper, Washerwoman, Librarian,
Investigator, Spy) are not part of this change.

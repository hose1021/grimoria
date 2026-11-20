# Trouble Brewing night steps as capabilities: the Spy

Issue: #200

## Why

The Spy is the last Trouble Brewing role the engine names for the sake of a
night step's answer. `infoForStep` in `information.ts` returns the Grimoire
record for the role by its id, `night.ts` keeps a table of answer shapes whose
only entry is the Spy, and the step completion has a branch for the role that
stores the record. The module declares an empty legacy `nightStep` and the
registration it may claim.

The rule is one sentence: "Each night, you see the Grimoire" (Spy r3118), run
as "Each night, wake the Spy and show them the Grimoire for as long as they
need." Nothing is computed, nothing is chosen and nothing is asked. This
change ends the Trouble Brewing part of ADR 0002 slice 2, "Night steps:
Trouble Brewing remainder", after `tb-setup-information`.

## What changes

- The Spy's module declares its step on the `night-step` arm: every night, the
  `grimoire` shape, no target, no resolver. The legacy `nightStep` field is
  removed from the module.
- The `information` capability gains one decision, `grimoire`: the ability
  shows the Grimoire itself. It carries no value, no options and no text. The
  Spy's module returns it and reads no fact.
- `moduleInfoForStep` writes the record `{ kind: "grimoire" }` for that
  decision, the same for an owner who is drunk or poisoned. The step
  completion stores that record and does not store an answer sent with the
  step, as before.
- `infoForStep` no longer names the Spy, the table `infoKindFor` is removed
  and the step completion has no branch for the role. A role step now gets
  its shape from its declaration only, and a role without an answer has none.
- `docs/role-ownership.md`: the Spy's row declares `capability:night-step`,
  `capability:information` and `capability:adjudication`, and keeps the engine
  references of its registration.

## What stays

- **Registration.** "You might register as good & as a Townsfolk or Outsider,
  even if dead" is not a night step. The `adjudication` capability of the
  module and the engine code that applies a registration (`information.ts`,
  `setup.ts`, `day.ts`) are untouched.
- **An impaired Spy.** A poisoned player "has no ability, but the Storyteller
  pretends they do" and "may" be given false information (Poisoner r1737,
  Glossary r3168). The app cannot build a false Grimoire. It marks the step as
  impaired and warns the Storyteller to show a false one, and the record of
  the step is the same. That is unchanged; the role does not read whether its
  owner is impaired.
- **The table.** The night console decides by the role's id where to offer
  the button that opens the Grimoire. The screen is not part of this change.

## Impact

Behavior is unchanged. The step of every night, its key and order, the stored
record, the step line of the secret log, the handling of an answer, of
players, of a registration and of a redirect sent with the step, the command
events and the order of draws from the command ports stay the same, so saved
games and journals replay as before. No storage, command payload, schema or
pin changes.

The other information roles do not return the new decision; their answers are
unchanged.

After this change no Trouble Brewing role has a branch in `infoForStep` or in
the answer part of the step completion. The information roles of Bad Moon
Rising and Sects and Violets keep theirs in `bmr.ts` and `sv.ts` until their
own slices.

# The Evil Twin introduction as a typed record

Issue: #211

## Why

The Evil Twin's first-night step shows both Twins to each other
([Evil Twin r3101](https://wiki.bloodontheclocktower.com/index.php?title=Evil_Twin&oldid=3101)):
point at the Evil Twin and show the Evil Twin token to the Good Twin; point at
the Good Twin and show the Good Twin's character token to the Evil Twin. The
engine stores only the rendered sentence in the step's `given`, so the two
players and the character shown exist as text and cannot be read as facts.

The branch already carries the Dreamer's `information` capability and its
`role-pair` decision arm. This change moves the Evil Twin's introduction to the
same capability and records the typed introduction through one optional field
on the existing `note` arm. It does not reuse `prepared`: that arm is one of
two players being one character, with a single `roleId` and a Storyteller
`matchIndex`, and forcing the two-character introduction into it would change
the Washerwoman, Librarian and Investigator rules.

## What changes

- `InformationDecision`'s `note` arm gains an optional `shown` list: the two
  players, Evil Twin first, and the character each other learns. The new
  `ShownTwin` type holds ids only; names stay presentation.
- `InformationContext` gains a `twins: { goodId; evilId } | null` fact, carried
  through `informationFacts` by an optional query field. The caller passes the
  validated `evilTwinPair`, so `information-facts.ts` imports no death code.
- The Evil Twin module declares an `information` capability with `infoKind:
  "eviltwin"`. It owns the two shown entries and the missing-pair note.
- `svInfoForStep` keeps the wording, the text key, the variables, the secret
  journal line and the projection. It records `shown` only under
  `EVIL_TWIN_SHOWN_RULESET_VERSION`, appended last, so older journals replay
  their text-only note.
- `InfoResult` gains `shown`, so the UI and tests read the record typed.

## Impact

Behavior at the table is unchanged. New Evil Twin steps gain one key in their
stored `given`; a command recorded before `tb-bmr-snv-2026-11-21.1` keeps the
exact bytes it wrote. The public projection does not include the pair, the
characters or the note. The `prepared` data contract, the host-choice path and
the night journal's privacy boundary are untouched.

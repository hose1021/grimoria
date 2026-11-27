# The zero is the Librarian's answer alone

Issue: #200

## Why

"Or that zero are in play" is a sentence of one ability: the Librarian's
(r1721). A Washerwoman (r2630) and an Investigator (r2983) always learn a
character.

The engine did not hold to that. A zero kept in setup under the Washerwoman's
or the Investigator's id was answered at the step like the Librarian's: the
step stored "В игре нет Изгоев.", and a drunk or poisoned owner was offered
the four Outsiders and the zero. The night start refuses such a record
(`info-washerwoman`, `info-investigator`, `drunk-info`) and the table offers
the zero for the Librarian only, so the record needs a command sent after the
night began, an imported game or an older save. When it is there, a
Washerwoman is told a sentence about Outsiders.

The secrets screen had the same fault. Under the Washerwoman or the
Investigator it showed a stored zero as the note "Изгоев в игре нет" and hid
the character and the two players, so the host could not prepare an answer
there.

The defect was found while the three roles moved to their modules
(`tb-setup-information`). That change kept it on purpose, because a move
changes no behavior, pinned it with two tests under the words "kept as found,
not a rule", and listed it as a limitation. The owner asked for the fix.

## What changes

- The `prepared` decision of the `information` capability gains `orZero`: the
  role says that its ability has a zero answer. The Librarian's module
  declares it. The Washerwoman's and the Investigator's do not.
- The engine writes the zero record only for a role that declares it. A zero
  held for any other role is no prepared answer: the step returns the record
  marked as missing and its completion asks for setup with `error.44`, for a
  healthy owner, an impaired owner and a Drunk shown the role alike. This is
  what the night start already says about the same record.
- The secrets screen shows a stored zero as the zero for the Librarian alone.
  Under the other two roles it shows the character and the two players, and
  choosing them replaces the zero.
- The ruleset version becomes `tb-bmr-snv-2026-11-17`. A command recorded
  under `tb-bmr-snv-2026-11-10` or `tb-bmr-snv-2026-11-16` keeps the answer it
  gave, so a saved journal replays and undoes as it was written.
- The two tests that pinned the old answer are replaced by tests of the rule.

## What stays

- **The Librarian.** A zero prepared for a Librarian, for a poisoned Librarian
  and for a Drunk shown the Librarian is recorded and offered as before, byte
  for byte.
- **Whether zero are in play.** That is still the Storyteller's answer in
  setup, checked by `secretsErrors` (`librarian-zero`). A role cannot say it.
- **The record of the zero.** Its sentence and the Outsider options are still
  written by the engine.
- **The commands.** `setSetupInfo` and `setSetupInfoZero` still store what is
  sent, as they store any other incomplete record; the check is the night
  start's and now also the step's.
- **Completed steps.** A step that already stored the sentence keeps it.

## Impact

Behavior changes in one case: a first-night step of a Washerwoman or an
Investigator, real or a Drunk's mask, that finds a zero in its setup record.
It asked nothing and stored the Outsider sentence; it now asks for setup and
is completed after a character and two players are prepared.

No storage format, command payload or schema changes. The ruleset version is
part of a command's fingerprint and of its seed, so commands sent from this
version on have new fingerprints and draws; recorded commands keep theirs.
One screen file changes (`secrets.tsx`, one line) with its helper.

# The Dreamer's pair as an information capability

Issue: #211

## Why

The Dreamer's pair is still built in `svInfoForStep`. That branch reads the
chosen player's character and its registration options, decides which good and
evil tokens are legal, applies the Vortox and impairment rules itself and
returns the finished `role-pair` record. The role module declares only its
night step, so the rule that says "one good and one evil character, one of
which is correct" (Dreamer r2904) lives in the shared Sects & Violets answer
factory instead of the role.

ADR 0002 moves each information answer onto the `information` capability, the
shape the Trouble Brewing information roles already use. The Dreamer is the
first role whose answer is not a value or a prepared pair but a set of legal
character pools: the choice among them is the Storyteller's, and whether the
pair must be false is the engine's. That needs one new decision arm.

## What changes

- `InformationDecision` gains one arm, `role-pair`. It carries the target
  (`subjectId`), the two character pools the answer draws from (`good`,
  `evil`) and the characters the target may be shown as (`possible`, the Spy
  r3118 and Recluse r3007 registration facts). It carries no chosen pair, no
  value, no options and no impairment flag.
- The Dreamer module declares an `information` capability with `infoKind:
  "dreamer"`. Its resolver reads the target and the registration facts and
  returns the pools. It never reads `impaired` and cannot choose the pair.
- `svInfoForStep` keeps the existing wrapper: the `requiresInfoPair(version)`
  gate and the legacy free-text note, `vortoxFalsifies`, the impairment flag,
  the pair derivation from the pools and the target's character, the
  host-answer requirement, the `textKey`, `textVars` and stored Russian
  fallback, the `role-pair` record, and the journal and replay shape.
- The now-dead `supportedRolesOf` and `possibleCharacters` helpers leave
  `sv.ts`; the registration facts come from `informationFacts`, the same
  builder the Trouble Brewing roles use.

## Impact

Behavior is unchanged. The offered pairs, the Vortox and impairment rules, the
stored `given` record and its key order, the `information-pair` journal case,
the log lines, the preview/apply/replay/undo and export/import results stay as
they were, so new journals replay and a pre-pair ruleset journal still replays
as its free-text note. No storage, command payload, schema or pin changes.

The other Sects & Violets branches leave `svInfoForStep` in later changes.

# Proposal

Issue: #35
Parent: #19

## Why

The official Devil's Advocate and Exorcist text limits both abilities with
"different to last night" ([Devil's Advocate r2594](https://wiki.bloodontheclocktower.com/index.php?title=Devil%27s_Advocate&oldid=2594),
[Exorcist r2973](https://wiki.bloodontheclocktower.com/index.php?title=Exorcist&oldid=2973)).
The engine currently stores the Exorcist's previous target but never rejects a
repeat, and the Devil's Advocate stores no previous target at all
(`docs/rules-matrix.md`, defect 4). A host can therefore repeat the same
target, and the UI still offers it.

## What Changes

- Store the previous target with the night number it was chosen on.
- Apply the restriction only when that night is the immediately preceding
  night, so a night without a choice breaks the pair.
- Treat a legacy target without a recorded night as unknown and allow the
  choice; the next successful choice writes a complete record.
- Add tests for a skipped night, death and resurrection, a role change away
  and back, and a legacy save round-trip.
- Build `previousTarget` for both Devil's Advocate and Exorcist steps from the
  actor's used-target record.
- Reject a repeat target in the shared night-step validation with a typed
  error code; the draft is discarded and the state does not change.
- Keep the UI target button disabled for `previousTarget` (already present).
- Add RED → GREEN tests in `js/bmr.test.mjs` for both roles, including a
  command-level rejection that proves state is unchanged.
- Update `docs/rules-matrix.md` statuses and `sw.js` after the runtime change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game/bad-moon-rising`: adds the consecutive-target restriction for Devil's
  Advocate and Exorcist.

## Impact

- Runtime: `js/engine/bmr.js`, `js/engine/night.js`, `js/locales/{ru,en,az}.js`.
- Tests: `js/bmr.test.mjs`.
- Docs and offline asset: `docs/rules-matrix.md`, `sw.js`.
- No schema change, migration or new dependency.

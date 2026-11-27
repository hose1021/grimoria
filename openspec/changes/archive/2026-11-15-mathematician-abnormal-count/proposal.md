# Proposal

Issue: #200

## Why

The Mathematician was `host-choice` only in the weak sense: `svInfoForStep`
created a note telling the Storyteller to count abnormal ability workings, and
the engine neither stored the ABNORMAL reminders nor counted them. The pinned
text defines a real count: "how many players' abilities worked abnormally
(since dawn) due to another character's ability", with one reminder per
character and the reminders removed after the Mathematician wakes
(`Mathematician.r3153`).

The cause is a Storyteller judgement; the count from recorded causes is not.
Issue #200 asks for the computed part to be computed and the rest to stay an
explicit host decision.

## What Changes

- Add the `abnormal` ledger to the state, with one `{ playerId, reason, at }`
  mark per character in the current day and night window.
- Add the `recordAbnormal` command: a living game, a real player, a non-empty
  reason, and no duplicate mark for that player and window.
- `svInfoForStep` returns the computed number, not a note. The marks stay the
  causal evidence; the engine never infers that an ability was abnormal.
- The Mathematician step counts the distinct marked characters, and clears the
  ledger after the step. A mark from an earlier day and night never counts.
- An impaired Mathematician or a living unimpaired Vortox gets the true count
  computed but must receive a host number; the options are 0 to the player
  count.
- Add the ABNORMAL marking panel to the table menu, with ru/en/az strings.
- The role stays `requires-storyteller-choice`: marking and false information
  are Storyteller decisions, and the count itself is now verified.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game/sects-and-violets`: the Mathematician count and abnormal marking.
- `app/table-console`: the ABNORMAL marking panel.

## Impact

- `src/core/model/types.ts`, `state.ts`, `src/core/commands/contracts.ts`,
  `src/core/engine/sv.ts`, `commands.ts`, `index.ts`.
- `src/ui/screens/table/cards.tsx` and the three locale catalogs.
- `docs/rules-matrix.md`, `src/core/roles/mathematician/rule.md`,
  `docs/rules-sources.md`.
- `pg.game.v4` stays compatible: `abnormal` is optional on load and written
  only by the new command.

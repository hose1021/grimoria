# Design

## Night record

The narrative log already names the victim or the protected player for most
roles: their resolutions return a concrete note (`note.poisoned`,
`note.protected`, an attack title, an information answer). The Sailor and the
Innkeeper are the exception: their step note is the prompt, and their
resolutions return no note, so a completed step logs "Шаг выполнен." and loses
the one fact the host decided, the drunk recipient.

Their resolutions gain a concrete note with the chosen players and the drunk
player, keyed for the console and with a Russian text for an older client and a
copied export:

- Sailor: `note.bmr.sailorChoice` — the chosen player and the drunk player.
- Innkeeper: `note.bmr.innkeeperChoice` — both protected players and the drunk
  player.

The keys are added to `ru`, `en` and `az`. The log entry shape, the journal and
the state schema do not change.

## Game-end chronicle

The log entry mapping currently lives inside `SidePanel` in `table/frame.tsx`.
Move it to `table/log.tsx` as one `GameLog` component that takes the view and a
display mode. `SidePanel` keeps the eight-line preview with filters; `OverCard`
renders the same component without the preview limit under the review table.
One component keeps the two surfaces in step, and the filters keep working.

## Undo and redo

The journal is already the history. Two defects remain:

- `dispatch` clears the redo stack unconditionally. A record-only command
  (`setNotes`, `setReviewOpen`, `normalizeSecrets`) coalesces into the trailing
  entry and is not itself undoable, but it still destroys the forward step.
  Clear redo only when the applied outcome is undoable, and on a history reset.

Undo after the game ends needs no new store path: `setWinner` is an ordinary
undoable command and the dock is rendered in the over phase. A test proves it.

## Verification

Engine: the Sailor and Innkeeper steps log the chosen players and the drunk
recipient. Store: redo survives `setNotes` and `setReviewOpen`; undo and redo
walk across `setWinner`. Browser: the over card shows the chronicle after a game
ends.

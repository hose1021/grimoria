# Design

## Context

The native `/table` console already renders the night, day, deal and over
cards from the published state (`src/ui/screens/table/`). Each card owns local
drafts in `useTableDrafts`, dispatches through `ShellPorts.commands.dispatch`
and reads the engine through `src/core/engine/index.ts`. The engine already
exposes `previewCommand`, a domain diff in `changes`, typed `events` and a
`future` view with active and delayed effects.

The step card currently disables "Complete step" from three booleans without
saying why, shows an information preview but no command preview, and reports a
rejection with `window.alert`. Saved log entries are printed as title and
detail only.

## Goals / Non-Goals

**Goals:**

- Explain a step before it is confirmed: who wakes, what is allowed, the chosen
  targets, the active effects and each remaining mandatory decision.
- Preview the exact command the confirm button will dispatch and keep the six
  consequence states separate.
- Block the step while its mandatory decisions are open and state each reason;
  show phase-transition previews without inventing a UI rule.
- Keep a rejected command's reason readable and dismissible.
- Let the Storyteller clear a wrong draft; the preview is pure and no trigger is
  applied twice.
- Prove ru/en/az guidance parity for the keys this change uses.

**Non-Goals:**

- No engine, command-payload, schema or storage change. The preview is read
  only and never saves.
- No new screen or route and no visual redesign of the existing cards.
- No localization of engine reason text: engine reasons stay as the engine
  produced them; the labels around them are translated.

## Decisions

**A preview port, not an engine import in the UI.** `ShellPorts.commands` gains
`preview(command: CommandInput): PreviewOutcome`. `src/entry/main.ts` wires it to
`previewCommand(store.state, command)` and narrows the result with
`toPreviewOutcome`. The command id is
`"preview:" + fingerprintOf(type, payload, RULESET_VERSION)` so repeated
previews of the same content reuse the engine's pinned timestamp and different
content does not look like a reused id. The card passes the preview's `id` and
`at` into the apply command, so apply reuses the pinned timestamp. Alternative:
importing `previewCommand` in `src/ui` was rejected by the UI policy (core types
only).

**One payload object.** `StepCard` builds the `completeNightStep` payload once
and uses it for both the preview and the confirm dispatch, so the preview cannot
drift from the applied command. `useMemo` keys on a serialized payload, the
stable `preview` callback and the store's `viewVersion`, so the one-second timer
re-render does not re-run the preview while undo or a correction does.

**Pure classifiers in `helpers.ts`.** `stepBlockers`, `rejectionOf`,
`consequencesOf` and `logConsequence` are DOM-free and unit-tested.
`consequencesOf` maps `effect.added` and
`phase.changed` to "state applied", `death.recorded` and
`player.alive_changed(alive=false)` to "death happened",
`registered_dead_changed(true)` and a blocked `result.noDeath` to "death
prevented", `player.alive_changed` with `alive=true` to "player revived", and
only a delayed effect that carries `resolve` (the Pukka's delayed death) to
"death scheduled"; an expiry-only poison or protection is not a scheduled
death.

**Blocking is a step view rule.** The engine still owns validation; the card
disables the confirm button while `stepBlockers` is non-empty and lists every
reason. Phase transitions keep the engine as the authority: the night and day
cards show the transition preview, and the engine's rejection reason appears in
the banner. The UI does not invent a day-end block, because `endDay` accepts an
open nomination.

**Rejection banner instead of `window.alert`.** `TableScreen` keeps the last
`Rejection` in state, `rejectionOf(result)` produces it, and the console renders
a `role="alert"` banner with a dismiss control. The engine reason is unchanged,
so the host sees the same text in a place that survives the next render. The
import dialog routes its rejection through the same banner.

**Correction without double processing.** Step choices stay in drafts; the
preview reads them and never dispatches. A "Clear this step's input" control
drops targets, redirects, given answers, registrations and the BMR drafts; the
next preview starts from the empty draft, so a corrected target cannot leave a
stale trigger behind. Preview memos also key on the store's `viewVersion`, so
undo and a mounted correction invalidate them.

**Log categories.** `logConsequence` classifies a saved log entry from its
`kind` and the player's current life: a death or execution entry for a living
player is a prevented death, and a winner entry has no consequence label.

## Risks / Trade-offs

- `logConsequence` uses the player's current life, so a historical prevented
  death for a player revived much later can read as "prevented". It never reads
  localized title text.
- The preview runs on the live store state. The engine clones the draft, so it
  cannot mutate or save, but a very large custom game makes each preview
  proportional to the state size.

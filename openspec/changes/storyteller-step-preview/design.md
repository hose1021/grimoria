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
- Block the step or the phase transition while a mandatory decision is open and
  state the reason in the console.
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
`preview(command: CommandInput): DomainOutcome`. `src/entry/main.ts` wires it to
`previewCommand(store.state, command)`. The command id is
`"preview:" + fingerprintOf(type, payload, RULESET_VERSION)` so repeated
previews of the same content reuse the engine's pinned timestamp and different
content does not look like a reused id. Alternative: importing
`previewCommand` in `src/ui` was rejected by the UI policy (core types only).

**One payload object.** `StepCard` builds the `completeNightStep` payload once
and uses it for both the preview and the confirm dispatch, so the preview cannot
drift from the applied command. `useMemo` keys on a serialized payload and the
stable `preview` callback so the one-second timer re-render does not re-run the
preview.

**Pure classifiers in `helpers.ts`.** `stepBlockers`, `nightTransitionBlockers`,
`dayTransitionBlockers`, `rejectionOf`, `consequencesOf` and `logConsequence`
are DOM-free and unit-tested. `consequencesOf` maps `effect.added` and
`phase.changed` to "state applied", `death.recorded` and
`player.alive_changed(alive=false)` to "death happened",
`registered_dead_changed(true)` to "death prevented", `player.alive_changed`
with `alive=true` to "player revived", and `future.delayedEffects` to "death
scheduled". It never invents a death from a scheduled effect.

**Blocking is a view rule.** The engine still owns validation; the card disables
the button while `stepBlockers` is non-empty and lists every reason. For the
phase transition the same applies with `nightTransitionBlockers` (heir,
unfinished steps) and `dayTransitionBlockers` (open nomination). The engine
stays the final authority and its rejection shows in the banner.

**Rejection banner instead of `window.alert`.** `TableScreen` keeps the last
`Rejection` in state, `rejectionOf(result)` produces it, and the console renders
a `role="alert"` banner with a dismiss control. The engine reason is unchanged,
so the host sees the same text in a place that survives the next render.

**Correction without double processing.** Step choices stay in drafts; the
preview reads them and never dispatches. A "Clear this step's input" control
drops targets, redirects, given answers, registrations and the BMR drafts; the
next preview starts from the empty draft, so a corrected target cannot leave a
stale trigger behind.

**Log categories.** `logConsequence` classifies a saved log entry from its
`kind` and the stable engine titles ("предотвращена", "возвращается"), and the
side panel renders the same localized category chip the preview uses.

## Risks / Trade-offs

- The day-end rule blocks on an open nomination even though `endDay` itself
  tolerates it; this is the issue's mandatory-decision rule, not an engine
  rule, and the host can resolve the nomination first.
- `logConsequence` reads two fixed Russian engine titles. The engine owns those
  strings and does not localize them; if they change, the chip falls back to
  "state applied" instead of failing.
- The preview runs on the live store state. The engine clones the draft, so it
  cannot mutate or save, but a very large custom game makes each preview
  proportional to the state size.

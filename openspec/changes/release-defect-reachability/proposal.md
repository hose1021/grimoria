# Proposal

Issue: #200
Refs: #216, #218, #219

## Why

The release evidence on `40f6830` left three confirmed defects where the engine
rule existed but the production console could not reach the decision:

- The Pit-Hag's arbitrary deaths were gated on `step.canKill`, which the
  completion sets after the one-shot payload is built.
- The Tinker's night-step arm declared `timing: "other"`, so the host had no
  first-night death step.
- The Storyteller journal sliced `state.log` to the last eight lines, so older
  Dreamer and Sage pairs could not be inspected.

A component or unit test alone did not prove reachability; each defect survived
a source-level fix because the next layer in the chain still hid it.

## What Changes

- The Pit-Hag death control follows the drafted character: it appears only when
  the draft names a not-in-play Demon, and the engine keeps the official guard.
- The Tinker declares a step for every night. The first-night step is appended
  outside the printed order and gated by `FIRST_NIGHT_TINKER_RULESET_VERSION`,
  so later step keys and old journals stay stable.
- The journal keeps its eight-line preview and can expand to the full history.
  Dreamer and Sage pairs stay private and readable from the recorded log.
- Production-route browser checks cover all three, including negative cases,
  command consequences, reload, replay, undo and redo.

## Out of Scope

- Replacing the existing death or information writers.
- Recomputing information pairs in the UI.
- Changing the printed night order.
- The remaining #216 consequential-choice inventory.

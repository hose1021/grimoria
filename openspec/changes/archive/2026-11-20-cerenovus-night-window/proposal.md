# Keep the Cerenovus madness through the following night

Issue: #220

## Why

The engine expired a Cerenovus madness token at the start of the next night.
The pinned Storyteller instructions say the execution may happen "during the
next day or night", so the token must cover the night after the mad day. The
current behavior also made the new night execution control unreachable for a
Cerenovus token.

## What changes

- A Cerenovus token expires at the next dawn, not at the next night.
- A night execution is available for a token told on an earlier night.
- A token told on the current night is excluded from the night execution
  control and rejected by the command; it is for the next day.
- The Mutant's standing token keeps its existing night execution.

## Impact

- `src/core/engine/sv.ts`, `src/core/engine/day.ts`, the table projection and
  menu.
- `docs/rules-matrix.md` and the Cerenovus rule dossier citations.
- No storage, journal or command-shape change. One additive error code
  `error.73` names the not-yet-due window.

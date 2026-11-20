# Design

## Local draft

`NotesField` owns the textarea value. `onChange` updates the draft only. Three
commit points write it through the command boundary:

- a 600 ms debounce after the last change;
- blur, so leaving the field commits at once;
- unmount, so a route change does not lose the draft.

`committed` records what the store already holds; a debounce whose draft equals
it does nothing, so a store round-trip cannot cause a loop. A `value` change
from the store (import, undo) resets both.

## Why not a store-only debounce

The command boundary must stay the only writer of the game state (the
architecture rule). The field keeps the uncommitted text in component state and
writes once; the engine remains deterministic and the journal small.

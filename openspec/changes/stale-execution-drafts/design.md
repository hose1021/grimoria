# Design

## Problem

`state.createdAt` changes only on a new game or an import. A day transition
changes `state.day.number`; a phase change moves `state.phase`. The old effect
could not see either, so both drafts survived.

## Change

`executionDraftKey(state)` returns `phase:day:night`. The table screen's effect
depends on it, so any transition clears both drafts in one place instead of a
clear in every caller. The dock and the day card already dispatch the target
selection; neither owns the lifetime.

## Why not clear in the engine

The drafts are UI state, never part of the command or the saved game. Clearing
them in the screen keeps the engine deterministic and the journal unchanged.

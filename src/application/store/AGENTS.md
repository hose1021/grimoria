# Store transaction

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root (with the configured RTK wrapper).

Preserve prepare → validate → apply → persist → publish ordering. Rejection and Storyteller-choice outcomes must not mutate or persist the game.

On failed persistence restore the pre-command state and revision; publish the failure without confirming the mutation.

`getSnapshot()` must return the cached object until publish. Distinguish persisted `gameRevision` from publication `viewVersion`; notify subscribers only through the existing publication path.

Check: `node --test src/application/store/*.test.ts src/entry/store.test.ts`; cover failure, undo and snapshot identity when changing transactions.

# Proposal

Issue: #200

Related: #212. This is a bounded follow-up to the integrated foundation in
PR #254; it does not complete either tracking issue.

## Why

Review of `ff0bfdb` reproduced five defects: malformed effect collections
crash save recovery, invalid journal bases allow undo to erase game data,
role corrections offer only Trouble Brewing characters, saved custom bags
do not restore changed pools with the same ID, and madness executions lose
the deterministic command context.

## What Changes

- Reject malformed external state before effect graph evaluation and validate
  journal bases before they can become undo state.
- Restore a saved custom bag's pool even when its script ID is unchanged.
- Offer role corrections from the active script.
- Pass command time and randomness through madness execution.
- Add failing regressions first, including actual browser interactions for
  both UI defects, then run the complete verification suite.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game/state-and-storage`: malformed saves recover without exceptions or
  destructive undo.
- `game/command-engine`: madness execution records replay deterministically.
- `app/table-console`: corrections use the current script's characters.
- `game/custom-scripts`: saved custom bags restore their saved pools.

## Impact

State validation, engine execution context plumbing, bag/correction UI,
Node tests and the existing browser harness. No dependency, schema, rule pin,
host-choice policy or storage-key changes.

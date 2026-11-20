# Proposal

Issue: #19

## Why

The pinned States revision permits executing dead players and explicitly
distinguishes execution from death. The engine currently rejects a host
execution of a corpse and treats an execution without a death as no execution
for the Mayor and Vortox. Existing tests and the baseline spec repeat the error.
The owner authorized correcting these conflicts on 2026-11-15.

## What Changes

- Allow one day execution of an existing player, alive or dead.
- Use the day execution event for Mayor and Vortox checks, retaining death-based
  checks for abilities that explicitly require an execution death.
- Enable the same legal selection in the table controls.
- Correct the contradicted test expectations and document the source audit.

## Impact

No dependency, persistence schema or source-pin change. Baseline specs remain
unchanged until the approved change is merged and synchronized. No publication
or merge is authorized by this local task.

# Proposal

Issue: #19

## Why

The source audit found two contradicted expectations. States r1039 explicitly
describes the Witch's curse being suspended by impairment and resuming on
recovery. Mastermind r2993 explicitly retains an extra night and day, but the
engine jumps directly to the day. The owner authorized both corrections on
2026-11-15 after reviewing the conflicts.

## What Changes

- Resolve a Witch curse only while its source has an active ability.
- Retain the curse record so temporary impairment can suspend it and recovery
  can reactivate it during its existing duration.
- Run the ordinary night after the Demon execution and mark the Mastermind's
  extra day at dawn instead of skipping the night.

## Impact

No new dependency, source pin or persistence schema. Existing `extraDay` and
effect fields suffice. Correct contradicted tests explicitly; do not sync
baseline specs before merge. No publication is authorized.

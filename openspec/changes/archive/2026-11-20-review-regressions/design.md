# Design

## Scope and evidence

The five defects were reproduced on `ff0bfdb`. The baseline passed
`npm run verify` (732 tests) and 107 script tests. Source recovery verified
all 82 provenance entries without changing tracked metadata.

Rules check: compliant. Cerenovus r3048 and Mutant r1755 keep execution a
Storyteller decision. Setup r1361 selects characters from the chosen edition;
Bad Moon Rising r2871 and Sects & Violets r3127 supply their distinct rosters.
Only data validation, UI selection/restoration and deterministic context
propagation change; existing rule decisions remain authoritative.

## Decisions

1. Treat external effects and journal bases as untrusted. Structural errors
   must return validation failures before graph traversal. Preserve the typed
   cyclic-effect error for structurally valid graphs, legacy migration,
   schema v4 and existing backup/no-overwrite behavior. A journal base must
   be a valid replayable game, not merely an object.
2. Loading a saved custom bag restores its pool independently of script-ID
   equality. Preserve appropriate script metadata and existing official
   script factories.
3. Render correction choices from the active script and continue dispatching
   through the existing validation boundary.
4. Forward the current command context to the shared execution function;
   leave execution rules and host decisions unchanged.

## Validation and risks

Exercise malformed effects and journal bases through both codec and store
boundaries, including recovery, rejection without mutation and valid undo.
Retain positive coverage for old saves and typed graph failures. Compare
madness preview, apply and replay state/events with pinned command time.
Exercise saved-bag loading and role correction in the real browser at phone
and desktop sizes, then run existing offline/update/privacy checks.

Nested journal validation must avoid uncontrolled recursion. UI tests must
assert persisted outcomes, not only option markup. No generated official
snapshots, reference digest, build outputs or tool dependencies are committed.

## Delivery

Keep changes on `fix/review-regressions`; do not merge or close the umbrella
issues. Record local RED/GREEN and verification evidence in `tasks.md`.

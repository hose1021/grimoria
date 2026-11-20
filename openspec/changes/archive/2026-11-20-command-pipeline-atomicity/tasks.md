# Tasks

- [x] Read the root and nested guidance, issue #213, ADR 0002 and the store and
  command specs.
- [x] Reproduce the replacement publication and record-only idempotency defects
  with focused regressions.
- [x] Fix `runReplacement` to persist without failure notification, roll back,
  then publish one failed status.
- [x] Record every accepted command in `state.applied` and keep journal
  coalescing.
- [x] Add stale-disk dispatch, invariant refusal and replacement regressions.
- [x] Update ADR 0002 and `SPEC.md` with the sequential-write guarantee and the
  simultaneous-write limit.
- [x] Run the focused suites, `npm run verify`, OpenSpec checks and the
  available Node 24 verification.

## Evidence

- RED: `node --test --test-name-pattern="failed replacement|disk moved|violates invariants|record-only command stays" src/application/store/create-game-store.test.ts`
  failed two tests: the replacement was published (`reset / thrown never
  publishes the replacement`) and the repeated record-only id was not
  idempotent.
- GREEN: the same command passed four tests after the fixes.
- GREEN: `node --test src/application/store/create-game-store.test.ts src/core/engine/commands.test.ts src/core/engine/invariants.test.ts src/core/engine/journal-preview.test.ts src/entry/store.test.ts`
  passed 120 tests.
- GREEN: `npm test` passed 1187 tests.
- GREEN: `npm run verify` passed typecheck, lint, format, tests, build,
  fallback, offline, source policy, provenance, acceptance, version and
  ownership checks on Node 24.19.0.
- GREEN: `node scripts/openspec-check.ts` passed 25 specs and 62 active
  changes; `openspec validate --changes --strict` passed 62 changes;
  `openspec validate --specs --strict` passed 25 specs.
- GREEN: the full-game suite passed 10/10 scenarios with Playwright 1.65.1
  and Chromium 1255; with `BASE_PATH=/pocket/`.
- GREEN: `node scripts/browser-check.ts` passed every phase, including the
  360x640 and 640x360 acceptance runs, saved custom bag, role corrections,
  madness execution, player voting, lunatic setup, setup-zero, demon wake,
  Pukka/Goon, Mayor redirect, heir, Chef label, Tinker and night resurrection.
- RED: the review regression `an accepted record-only id survives coalescing
  and an undo replay` failed because undo rebuilt `state.applied` from the
  coalesced journal and lost the accepted id; the reload variant failed with
  `idempotent: undefined`.
- GREEN: the focused review set passed six tests, including redo, an undone id
  applying again, an older save with a lost id, and a history reset clearing
  the previous ledger. The command/store suites passed 126 tests; `npm test`
  passed 1193.
- GREEN: `npm run verify` passed again after the review fixes.
- GREEN: `node scripts/run-scenarios.ts` passed 10/10 and
  `node scripts/browser-check.ts` passed every phase after the review fixes.
- RED: `record-only command identities keep the saved state linear` failed at
  4000 changes with a 9,125,844-byte state (1,000: 779,433; 2,000: 2,553,933).
- GREEN: the same test passes after the compact identity. The state is
  208,951 bytes at 1,000; 412,951 at 2,000; 820,951 at 4,000. Applied entries
  and the export contain no intermediate note text; a repeated old id is
  idempotent and a legacy full fingerprint still loads and replays.
- GREEN: the focused browser check `PG_BROWSER_CHECK=notes-4000` passed: a
  4,000-character edit is saved, applied entries use compact identities and the
  saved value stays below 2 MB.
- GREEN: after the compact identity, `npm test` passed 1195 tests,
  `npm run verify` passed, full-game scenarios passed 10/10 and the full
  browser flow passed with the `notes-4000` check.

# Tasks

- [x] Read pinned Lunatic r3112 and verify the permitted scope.
- [x] Create issue-linked proposal, design and delta requirements.
- [x] Record failing engine and browser regressions.
- [x] Fix the default without changing stored choices or historical replay.
- [x] Verify overrides, replay, privacy and phone UI.
- [x] Run the repository verification and strict OpenSpec checks.
- [x] Open the PR for owner review without merging.

## Evidence

- Rules check: compliant. Lunatic r3112, How to Run, permits any three good
  characters, including in-play roles; using the host's Demon list is allowed.
- RED: Node 24.22.3 `node --test --test-name-pattern='unchosen Lunatic bluffs|clearing separate Lunatic bluffs|Lunatic first-night information' src/core/engine/setup.test.ts`
  failed both new empty-list regressions; the existing explicit/absent case
  passed. Log: `/private/tmp/grimoria-lunatic-bluffs-core-red.log`.
- RED: `PG_BROWSER_CHECK=lunatic-setup node scripts/browser-check.ts` failed
  with zero displayed bluffs instead of the three Demon choices. Separate
  runs reproduced unwanted materialized overrides on legacy setup undo and
  saved-bag loading. The initial failure is recorded in the tool output;
  legacy-case logs: `/private/tmp/grimoria-lunatic-browser-legacy-red.log`,
  `/private/tmp/grimoria-lunatic-browser-legacy-bag-red.log`.
- RED: the authentic `35b34c9` journal fixture exposed changed persisted
  queue notes and completed-step information under unversioned replay.
  `node --test --test-name-pattern='legacy empty Lunatic bluff journal' src/core/engine/setup.test.ts`
  failed canonical equality. Log: `/private/tmp/grimoria-lunatic-bluffs-legacy-red.log`.
- GREEN: all setup tests pass, including the old empty-list fixture's replay
  and undo/reapply; focused current and legacy cases pass. Logs:
  `/private/tmp/grimoria-lunatic-bluffs-setup-green.log`,
  `/private/tmp/grimoria-lunatic-bluffs-core-final-green.log`.
- GREEN: Node 24.22.3 `npm run verify` passes all typechecks, lint, format,
  761 tests, build, fallback/offline generation, source policy, provenance,
  acceptance and role ownership. Log: `/private/tmp/grimoria-lunatic-bluffs-verify.log`.
- GREEN: `node --test scripts/*.test.ts` passes 107 tests. OpenSpec 1.16.1
  strict validation passes 33 active changes and 24 main specs;
  `node scripts/openspec-check.ts` passes.
- GREEN: focused and full `node scripts/browser-check.ts` runs pass using
  external Playwright with `PLAYWRIGHT_MODULE` and `PLAYWRIGHT_BROWSERS_PATH`.
  Coverage includes empty/default lists, partial and full overrides, clearing,
  legacy bag load/undo, later Demon edits, reload and first-night card privacy.
  Logs: `/private/tmp/grimoria-lunatic-browser-{green,full}.log`.
- Production smoke: the test-enabled production artifact at
  `http://localhost:8010/` passes real `/bag` and `/table` interactions at
  390 and 1280 px, with no overflow, console or page errors. Phone screenshots
  were visually checked. Log: `/private/tmp/grimoria-lunatic-bluffs-smoke.log`.
- Source recovery: the authorized fetch/check and digest build/check passed;
  ignored snapshots/digests remain untracked and no provenance metadata changed.
- Review: versioned both queue construction and BMR completion information,
  preserved old command versions, and kept unchosen legacy UI lists empty.
  No dependency, stored field, schema version or rule pin changed.
- Delivery: [PR #257](https://github.com/hose1021/grimoria/pull/257) is open;
  CI is being monitored separately. No merge has been performed.

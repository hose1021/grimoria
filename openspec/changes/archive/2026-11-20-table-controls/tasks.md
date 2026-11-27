# Tasks

- [x] Read pinned sources and guidance; record compliant scope and design.
- [x] Add RED setup and voting regressions.
- [x] Implement default/manual mask, separate bluffs and deterministic shuffle.
- [x] Implement manual vote commands and incomplete-ledger host answers.
- [x] Add and verify setup and player-bubble controls in all three locales.
- [x] Verify compatibility, privacy, undo and deterministic replay.
- [x] Run full verification, browser tests, scenarios and OpenSpec checks.
- [x] Review diff and record delivery state.

## Evidence

The branch stacks on local `daa9db4`, preserving all five review fixes.
Commands use Node 24.22.3. Browser commands use the external Playwright 1.65.0
module and downloaded Chromium via `PLAYWRIGHT_MODULE` and
`PLAYWRIGHT_BROWSERS_PATH`; no dependency was added to the repository.

- RED: With Node 24.22.3 and Playwright 1.65.0,
  `PG_BROWSER_CHECK=player-voting node scripts/browser-check.ts` failed because
  the player's vote input did not exist; `PG_BROWSER_CHECK=lunatic-setup node
  scripts/browser-check.ts` independently failed because the follow-default
  mask control did not exist. Logs:
  `/private/tmp/grimoria-controls-ui-player-voting-red.log` and
  `/private/tmp/grimoria-controls-ui-lunatic-setup-red.log`.
- Baseline tooling: `node --test scripts/*.test.ts` passed all 107 tests.
- Sources: `node scripts/check-official.ts` passed 82 entries; the generated
  reference digest check passed 72 roles and three scenarios. Tracked source
  metadata and pins remain unchanged.
- RED: the nine initial setup/model/library regressions all failed. Their
  recorded test set can be selected with `node --test
  --test-name-pattern='automatic Lunatic|explicit Lunatic|legacy Lunatic mask|bluff shuffle|Lunatic first-night|present Lunatic setup|saved bags round-trip'
  src/core/engine/setup.test.ts src/core/model/state.test.ts
  src/infrastructure/library/bag-library.test.ts`. Log:
  `/private/tmp/grimoria-controls-setup-red.log`.
- GREEN: all nine initial setup regressions passed; after the additional
  historical journal fix, the setup, BMR, model and library suites passed
  224 tests. Logs: `/private/tmp/grimoria-controls-setup-green.log` and
  `/private/tmp/grimoria-controls-setup-suite.log`.
- RED: `node --test --test-name-pattern='manual vot|manual dead|host answers after manual' src/core/engine/commands.test.ts src/core/model/state.test.ts src/core/engine/snv.test.ts`
  ran eight focused tests; seven failed because the new commands were unknown
  and malformed vote maps were accepted. Log:
  `/private/tmp/grimoria-controls-votes-red.log`.
- GREEN: the same voting command passed all eight regressions. The surrounding
  commands, TB, S&V, state and preparation suites passed 323 tests. Logs:
  `/private/tmp/grimoria-controls-votes-green.log` and
  `/private/tmp/grimoria-controls-votes-suites.log`.
- RED: `node --test --test-name-pattern='legacy Lunatic journal' src/core/engine/setup.test.ts`
  failed on an authentic synthetic v4 journal from `daa9db4`: newly added
  defaults changed the mask and random deal during replay. Log:
  `/private/tmp/grimoria-controls-legacy-red.log`.
- GREEN: the legacy journal regression now preserves the complete canonical
  state, all dealt roles, and undo/redeal. The focused legacy/current setup
  command using pattern `legacy Lunatic|automatic Lunatic|explicit Lunatic|host bluff shuffles`
  passed five tests. An independent eight-case matrix (plain setup, roster
  reset, count change, old new-game base; each with deal or start) matched old
  full state and undo byte-for-byte. Logs:
  `/private/tmp/grimoria-controls-legacy-green.log` and
  `/private/tmp/grimoria-controls-legacy-matrix.log`.
- RED: the extended `PG_BROWSER_CHECK=lunatic-setup node scripts/browser-check.ts`
  check reproduced the missing default on an imported old empty setup. Current
  UI edits now stamp the inferred mode without rewriting historical commands.
  Log: `/private/tmp/grimoria-controls-ui-legacy-red.log`.
- GREEN: both focused browser commands passed after all changes, including
  legacy defaults, explicit overrides, independent pools, saved bags, reload,
  real and registered-dead vote controls and phone/desktop layout. Aggregate
  logs: `/private/tmp/grimoria-controls-ui-{red,green}.log`.
- Full GREEN: `npm run verify` passed typechecks, lint, formatting, 758 tests,
  production build, fallback/worker generation, source policy, provenance,
  acceptance and ownership checks. Log: `/private/tmp/grimoria-controls-verify.log`.
- Full GREEN: `node scripts/browser-check.ts` passed, including earlier five
  fixes, Fortune Teller self-target, Lunatic privacy with independent in-play
  bluffs, offline, update, language, phone and tablet coverage. Log:
  `/private/tmp/grimoria-controls-browser.log`.
- Production smoke: the generated production build served at
  `http://localhost:8010/`; `/bag` and `/table` exercised at 390 px with real
  synthetic game state. Mask override/reset, both shuffles, vote tally, dead
  token and reload passed, with no horizontal overflow or console/page errors.
  Four phone screenshots were visually reviewed. Log:
  `/private/tmp/grimoria-controls-smoke.log`.
- OpenSpec 1.16.1: `openspec validate --changes --strict` passed 32 changes;
  `openspec validate --specs --strict` passed 24 specs;
  `node scripts/openspec-check.ts` passed.
- Full-game GREEN: build in test mode with `BASE_PATH=/pocket/`, generate the
  fallback and offline worker with the same base, then
  `node scripts/run-scenarios.ts` passed 10/10 scenarios. Log:
  `/private/tmp/grimoria-controls-scenarios.log`.
- Final review: independent setup and voting cross-reviews found no remaining
  actionable issue. `git diff --check` passed. No dependency, storage key,
  schema-version, rule pin or generated artifact changes are included.
- Delivery: local branch `feat/table-controls`, stacked on `daa9db4`, with
  commit message `feat: add lunatic setup and player voting controls`.
  No remote branch, issue, pull request or deployment was modified.

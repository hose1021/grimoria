# Tasks

## 1. RED: phone acceptance walk

- [x] 1.1 Add the clean-profile `walkPhone` acceptance to `scripts/browser-check.mjs`: reach setup, bag, player, seat, secrets, night, day, result and review at 360x640 and 640x360 by tapping visible controls, asserting no document overflow, no control outside the viewport, no control clipped by an overflow-hidden ancestor, every link/button at least 44x44, and no config or bag-registry key.
- [x] 1.2 Run `node scripts/browser-check.mjs` against the current build and record the failing screen and controls.
- [x] 1.3 Record the RED command and failure in the Evidence section.

## 2. GREEN: size the exposed controls

- [x] 2.1 Raise the console header Undo/Hide buttons to 44 px at the mobile breakpoints in `src/ui/screens/table/styles.ts`.
- [x] 2.2 Raise the bag scenario pills and tabs to 44 px in `css/bag.css` and the count steppers to 44x44 in `css/setup.css`.
- [x] 2.3 Re-run `node scripts/browser-check.mjs` and confirm the whole suite, including both phone viewports, passes.

## 3. Verification

- [x] 3.1 Run `npm run format`.
- [x] 3.2 Run `npm test` and record the pass count.
- [x] 3.3 Run `node scripts/browser-check.mjs`, `npm run verify`, `node scripts/openspec-check.mjs`, `openspec validate --changes --strict` and `openspec validate --specs --strict`.
- [x] 3.4 Run `git diff --check` and confirm a clean worktree after the commit.
- [x] 3.5 Open the pull request, report the RED/GREEN evidence and stop; no merge.

## Evidence

- RED: `node scripts/browser-check.mjs` with the three style files at `HEAD` -> `phone 360x640 setup: controls below 44px`
  `['button undo Отменить 83x36', 'button hide Скрыть экран 109x36']`.
- RED (bag only, with the console header already fixed) -> same command,
  `phone 360x640 bag: controls below 44px` with
  `['button  − 40x40', 'button  + 40x40', 'button  Trouble Brewing 118x31',
  'button  Bad Moon Rising 121x31', 'button  Sects and Violets 124x31',
  'button  Свой сценарий 115x31', 'button  3 набора 79x31', 'button  Вручную
  78x31', 'button  Случайно 83x31']`.
- GREEN: `node scripts/browser-check.mjs` -> passed, printing
  `phone 360x640 acceptance reached: setup -> bag -> player -> seat -> secrets -> night -> day -> result -> review`
  and the same list at `640x360`, then the existing suite summary.
- GREEN: `npm test` -> 420 tests, 420 pass, 0 fail.
- GREEN: `npm run verify` -> typecheck, lint, format check, tests, build,
  fallback, offline worker and source policy all passed.
- GREEN: `node scripts/openspec-check.mjs` -> 19 specs, 3 active changes;
  `openspec validate --changes --strict` -> 3 passed; `openspec validate --specs
  --strict` -> 19 passed; `git diff --check` -> clean.

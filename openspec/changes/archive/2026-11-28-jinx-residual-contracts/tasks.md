# Tasks

## 1. Pinned rules

- [x] 1.1 Read Lunatic r3112, Imp r3116, Drunk r3165, Mathematician r3153,
      Sage r3009 and Recluse r3007. Rules check: compliant.
- [x] 1.2 Record the behavior and timing in `design.md`.

## 2. Behavior

- [x] 2.1 Resolve the Lunatic comparison when either the Demon or the Lunatic
      step closes the pair; keep the Mathematician clear authoritative.
- [x] 2.2 Remove the Demon alive gate.
- [x] 2.3 Share the Sage true pair set between the answer and the Drunk check.
- [x] 2.4 Build and answer the Sage death step for a Drunk shown the Sage.
- [x] 2.5 Keep the Recluse registration for the real Sage only.
- [x] 2.6 Gate the new Demon flag by `DEMON_ATTACK_SOURCE_RULESET_VERSION` so
      an old journal replays without it and without a Sage step.

## 3. Tests

- [x] 3.1 `JINX-LUNATIC-07`: Demon completed first.
- [x] 3.2 `JINX-LUNATIC-08`: Demon dies in its own step.
- [x] 3.3 `JINX-LUNATIC-09`: no mark after the Mathematician clear.
- [x] 3.4 `JINX-DRUNK-07/08/09`: Drunk shown the Sage wake, true pair, false
      pair.
- [x] 3.5 `JINX-SAGE-06`, `JINX-REPLAY-02`: implied registration replay.
- [x] 3.6 `JINX-SAGE-07`: an old-version Imp attack journal replays without
      the Demon flag or a Sage step.

## 4. Evidence

- RED: `node --test src/core/engine/jinxes.test.ts` failed the new
  `JINX-LUNATIC-07`, `JINX-LUNATIC-08`, `JINX-LUNATIC-09`, `JINX-DRUNK-07` to
  `JINX-DRUNK-10` and `JINX-REPLAY-02` tests on the unchanged engine: no
  out-of-order mark, no Drunk Sage step, no replay coverage.
- GREEN: `node --test src/core/engine/jinxes.test.ts` passes 32/32.
- GREEN: `npm test` passes 1589/1589.
- GREEN: `npm run verify` exits 0.
- GREEN: `openspec validate --changes --strict` and
  `openspec validate --specs --strict` pass; `node scripts/openspec-check.ts`
  passes.
- [x] `npm run verification:gates`, `npm run verification:mutation`,
  `npm run scenarios` and Playwright on the branch head.

## 5. Documentation

- [x] Update `docs/audits/epic-475-readiness.md` and
      `docs/audits/verified-jinx-independent-audits.md`.
- [x] Update the interaction registry test lists.

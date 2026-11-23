# Tasks

## 1. Pinned rules

- [x] 1.1 Read the seven jinx pairs and each role's Summary/How-to-Run/Examples
      at the pinned revisions. Rules check: compliant.
- [x] 1.2 Record the exact behavior, timing, host choice and impairment rule in
      `docs/adr/0004-verified-jinx-behaviors.md`.

## 2. Behavior

- [x] 2.1 Chambermaid: move the answer to an `information` capability and count
      the whole night's wake set.
- [x] 2.2 Drunk: add the ABNORMAL mark at a completed Drunk ability step.
- [x] 2.3 Fang Gu + Scarlet Woman: refuse inheritance while another living
      Demon exists; the possession leaves her a Minion.
- [x] 2.4 Goon + Pit-Hag: mark a Pit-Hag-created evil Goon and keep its
      alignment when a good player chooses it.
- [x] 2.5 Lunatic: compare the completed Lunatic and acting Demon choices,
      including "Demon attacked nobody".
- [x] 2.6 Mastermind + Vigormortis: retain the dead Mastermind's ability after
      the Vigormortis dies and arm the extra day.
- [x] 2.7 Recluse + Sage: add the Recluse to the legal pair candidates and
      journal the implied registration.
- [x] 2.8 Flip all seven interaction statuses to `verified` with their test
      names.

## 3. #211 migration

- [x] 3.1 Migrate Chambermaid's answer and the legacy night-step declarations
      for Courtier, Godfather, Gossip, Grandmother, Lunatic, Moonchild,
      Professor, Ravenkeeper, Undertaker and Zombuul.
- [x] 3.2 Document every remaining engine-branch role with a reason and a
      follow-up in `docs/audits/211-remaining-adapters.md`.

## 4. Evidence

- RED: `node --test src/core/engine/jinxes.test.ts` on a clean `origin/dev`
  tree fails 10 of 11 tests; the Fang Gu possession test passes because the
  engine already left the Scarlet Woman a Minion, and it is kept as regression
  proof.
- GREEN: `node --test src/core/engine/jinxes.test.ts` passes 23/23 on the
  branch.
- GREEN: `npm test` passes 1580/1580.
- GREEN: `npm run typecheck` passes.
- [x] `npm run verify`, OpenSpec strict and gates on this working tree.
- [x] Mutation (10/10 critical mutations detected) and full-game scenarios (10/10) on this working tree.
- [x] Browser check: certified jinxed mixed pools show automatic mode; the Sage
      pair remains reachable. The full Playwright suite passed.

## 5. Documentation

- [x] 5.1 OpenSpec change and ADR 0004.
- [x] 5.2 Rules matrix, interaction registry and role ownership.
- [x] 5.3 Readiness/acceptance report and explicit remaining unsupported list:
      `docs/audits/epic-475-readiness.md` and
      `docs/audits/al-vs-al-readiness.md`.
- [x] 5.4 Al vs Al readiness note: `docs/audits/al-vs-al-readiness.md`
      records the missing roster/source blocker and the separate work items; no
      character is implemented.

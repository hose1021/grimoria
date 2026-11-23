# Verified jinx independent audits

Scope: PR #477, head `c50c1e8`, branch `feat/verified-jinxes`, plus merged
foundation PR #476.

This file records the independent audits, their findings and the fixes. It is a
summary; the exact commands and test names are in the linked reports and the
PR body.

## Rules and engine

### Round 1 — `JinxCompliance`

Verdict: **REQUEST CHANGES**. Five confirmed defects:

1. The Lunatic ABNORMAL mark was re-added after the Mathematician cleared it.
2. A Lunatic killed before waking still marked the Demon's attack.
3. The Sage forced a Recluse registration when the pair named the real Demon,
   under Vortox, or while impaired.
4. The Sage registration was journaled twice.
5. A Drunk given a true scalar answer was still marked.

Fix commit: `69a8828`. Regressions: `JINX-LUNATIC-03`, `JINX-LUNATIC-04`,
`JINX-SAGE-02`, `JINX-DRUNK-03`.

### Round 2 — `JinxReaudit`

Verdict: **REQUEST CHANGES**. Two confirmed defects:

1. The Lunatic compared the death, not the Demon's chosen target; a protected
   same target and a Mayor redirect were wrong.
2. A Drunk's one-of-two truth check compared the prepared record, not the pair;
   the synthetic default and an alternative true answer were wrong.

Fix commits: `b626bf8` and `5824197`. Regressions: `JINX-LUNATIC-05/06`,
`JINX-DRUNK-04/05/06`, `JINX-SAGE-03/04/05`.

### Round 3 — `JinxReaudit`

Verdict: **ACCEPT** at `5824197`. The one-of-two truth is computed from the
pair; the synthetic legacy default is false information. No blocking defect.

## UI and privacy — `UiPrivacyAudit`

Verdict: **PASS** at `c50c1e8`, with coverage notes.

- `mixed-script`: certified pool automatic; `manualOnly` fallback manual; live
  toggle works; no console errors.
- `journal-pairs` at 390 px: Sage pair reachable, journaled, absent from
  `publicGameView`, replay/reload preserved.
- `washerwoman`: poisoned actor never offered the computed card; chosen pair
  recorded; healthy actor uses the prepared answer.
- RU/EN/AZ labels render correctly; no raw keys, no wrong-language leftovers.
- Full browser suite 37/37; `run-scenarios languages` 1/1.

Coverage notes: the pair-naming UI branch is unreachable while every registered
jinx is `verified`; `journal-pairs` checks privacy through `publicGameView`, and
the languages scenario does not visit bag/secrets (a fresh-build 390 px probe
did).

## Compliance — `JinxCompliance` final

Verdict: **ACCEPT** at `c50c1e8`. Re-verified:

- all five round-1 findings are resolved; the original 11 tests remain and
  `JINX-SAGE-02` was extended;
- `publicGameView`, `publicSeats` and `playerSnapshot` expose no new abnormal
  reason, Sage registration, Goon alignment or team fact;
- a Lunatic + Imp + Mayor redirect command path replays to canonical state;
- a failed save rolls back the attack target and the Sage registration, leaving
  the step unconsumed; a retry commits once;
- the interaction registry remains the only automatic-status source.

Residual follow-ups, not blockers: out-of-order Lunatic/Demon completion is
command-reachable but not UI-reachable and gives no mark; a Drunk shown a
`player-pair` role is marked unconditionally; a Demon that dies in its own step
is excluded by the alive gate; `JINX-REPLAY-01` covers the Drunk, not the Sage
registration. Each is listed in the readiness report.

## Verification

- `npm test`: 1580/1580.
- `npm run verify`, strict OpenSpec (28/28 changes, 27/27 specs), verification
  gates (523/172/87, 0 findings), mutation 10/10, full-game scenarios 10/10,
  full Playwright 37/37.
- CI green at `c50c1e8` on PR #477.

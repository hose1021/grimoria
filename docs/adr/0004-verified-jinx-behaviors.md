# ADR 0004: Verified official jinx behaviors

- Status: Accepted for implementation by the owner directive in [#475](https://github.com/hose1021/grimoria/issues/475)
- Date: 2026-11-23
- Extends: [ADR 0003](0003-script-agnostic-engine.md)
- OpenSpec change: `openspec/changes/verified-jinx-behaviors`

## Context

ADR 0003 registered the seven official jinx pairs but left every one
`unsupported`. A mixed pool containing one could not run automatically, and the
registry could not distinguish a missing behavior from a Storyteller choice.
The engine already has one queue, one ABNORMAL ledger, one death record, one
effect graph and one journal. The pinned rule text lives in
`docs/official/wiki/` and the official snapshot is
`docs/official/jinxes.json` (committed 2026-11-11).

## Decision

### 1. Each jinx writes an existing fact

| Pair                        | Fact                                     | Owner                                                           |
| --------------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| Chambermaid + Mathematician | the night queue's wake set               | `roles/chambermaid` information capability via `wokeTonight`    |
| Drunk + Mathematician       | `state.abnormal`                         | `recordJinxAbnormalities` at a completed Drunk step             |
| Fang Gu + Scarlet Woman     | death trigger + living Demon set         | the Imp succession capability refuses while another Demon lives |
| Goon + Pit-Hag              | `player.used.goonFromEvil`               | the Pit-Hag replace path; the Goon trigger reads it             |
| Lunatic + Mathematician     | step targets + `state.abnormal`          | `recordJinxAbnormalities` after the acting Demon step           |
| Mastermind + Vigormortis    | death record + `state.mastermind`        | `mastermindRetainsAbility` in `checkWin`                        |
| Recluse + Sage              | Sage `given` pair + `step.registrations` | the Sage answer and the shared step writer                      |

No new command, event history, effect graph or state store is added. Every
automatic mark is deterministic from completed steps and is persisted, so a
journal replay writes the same state.

### 2. The pinned behavior

- **Chambermaid:** counts characters who woke to use their ability. The whole
  night is considered, including the Mathematician printed after the
  Chambermaid. A player who woke only because another ability woke them does
  not count.
- **Drunk:** the jinx authorizes the ABNORMAL mark when the believed ability
  gives false information or fails; the Storyteller's information choice stays
  the existing host answer. A scalar true answer is not marked, and a
  one-of-two answer is true when the named pair contains that character (the
  prepared record or another true role). A missing prepared record is the
  legacy fallback and counts as false information. The mark is per character,
  so one Drunk is +1.
- **Fang Gu:** the first Outsider killed becomes an evil Fang Gu and the old
  Fang Gu dies. If another Demon lives, the Scarlet Woman remains a Minion; the
  same guard covers a Pit-Hag-created second Demon.
- **Goon:** the Pit-Hag changes the character but not the alignment. An evil
  player made the Goon cannot turn good through the Goon's own ability; the
  first chooser is still drunk and the Goon's other behavior is unchanged.
- **Lunatic:** the Lunatic chooses before the Demon and the Mathematician wakes
  last. One ABNORMAL mark is written when the chosen attack sets differ,
  including a Demon that attacked nobody.
- **Mastermind:** the Vigormortis's normal retention ends with its source. The
  pinned exception keeps the Mastermind's ability after the Vigormortis dies,
  so the extra day still arms.
- **Recluse + Sage:** a pair naming an unimpaired Recluse is a legal Sage
  answer because the Recluse may register as the Demon. The secret registration
  is recorded only when the pair contains no actual Demon; a Vortox or impaired
  Sage records no registration.

### 3. Status

All seven registry entries are `verified` with the asserting test. A pair
cannot be verified without a test; an unknown character remains `unsupported`.

### 4. #211 migration

The remaining legacy `nightStep`/`firstNightStep` declarations are moved onto
`night-step` capabilities. The remaining edition-specific completion branches
are either shared mechanics (Drunk, Fool, Mayor, Soldier, Tea Lady, Virgin,
Goon, Mastermind, Scarlet Woman, Minstrel) or role-specific completion slices
that need a new decision shape (Artist, Savant, Mutant, and the BMR/S&V outcome
panels). Each remaining reference is listed with a reason and follow-up in
`docs/audits/211-remaining-adapters.md`.

## Consequences

- A mixed pool with any of the seven pairs can run automatically; the roles'
  own support levels still apply.
- The Mathematician counts the new marks without a second count.
- The Sage gains pair options that name the Recluse; the UI already renders the
  pair list.
- The #211 ledger shrinks by ten step declarations; the remaining branches are
  explicit exceptions, not silent omissions.

## Verification

- RED on a clean `origin/dev` tree: the current 23-test `jinxes.test.ts`
  yields 8 passes and 15 failures; the original 15-test file was 12 failures
  and 3 passes because the jinx hook does not exist there. The Fang Gu
  possession test passes and is kept as a regression.
- GREEN: the same test passes 23/23; `npm test` passes 1580/1580.
- Full `npm run verify`, OpenSpec strict, gates, mutation, full-game scenarios
  and the full Playwright suite ran on this working tree. PR #477 carries the
  change and its CI is green at 5824197 after both re-audit rounds; the third
  independent re-audit accepted the one-of-two truth fix.
- Independent audit regressions: `JINX-LUNATIC-03` (the Mathematician's clear
  survives a later step), `JINX-LUNATIC-04` (a Lunatic killed before waking is
  not marked), `JINX-DRUNK-03` (a true scalar answer is not marked),
  `JINX-SAGE-02` (one journal entry; a pair naming the real Demon records no
  registration), `JINX-SAGE-03/04` (Vortox and impaired guard), `JINX-SAGE-05`
  (an existing registration is not written again), `JINX-DRUNK-04` (true
  prepared one-of-two information is not marked), `JINX-DRUNK-05` (the
  synthetic false default is marked), `JINX-DRUNK-06` (another true role in the
  pair is not marked), `JINX-LUNATIC-05` (same
  protected target) and `JINX-LUNATIC-06` (a Mayor redirect compares the chosen
  target, not the death), and `JINX-REPLAY-01` (the journal reproduces the
  ledger).
- Pinned sources: Chambermaid r2966, Mathematician r3153, Drunk r3165,
  Fang Gu r2974, Scarlet Woman r3117, Goon r2977, Pit-Hag r2998, Lunatic r3112,
  Mastermind r2993, Vigormortis r3015, Recluse r3007, Sage r3009.

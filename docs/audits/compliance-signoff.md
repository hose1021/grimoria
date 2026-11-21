# Compliance sign-off — BMR and Sects & Violets certification

Independent compliance audit of the Bad Moon Rising (BMR) and Sects & Violets
(S&V) certification. This report treats the three prior audit reports and the
two production-acceptance reports as **claims to falsify**, not as authority.
The pinned Wiki text is the only normative source.

Date: 2026-11-21. Runtime: Node.js 26.8.2 on darwin/arm64. Worktree:
`/Users/hose/Programming/grimoria/grimoria-audit-compliance` (branch `verify`).

## 1. Identity

| Item | Value |
| --- | --- |
| Final branch head audited | `8301d64648a6c69f0cf5e407b8f3efaf8734ce00` |
| Code tree audited | `e93d4c80267380198bdd1bc1268b44bff0a8dfff` (= `8301d646^` code state; delta is docs only) |
| Fix commit under test | `d8793fc45709eceaf0e60ea8e43a60a2a91906ff` |
| Parent / integration base | `6ad2c52bf866103cdce73ffa75c970067e17f805` (`origin/dev`) |
| Intermediate follow-ups | `9f494250` (type helper), `72a20ebe` (test whitespace), `03102c23` (format), `e93d4c80` (ownership ledger), `8301d646` (docs) |
| Product version | 0.7.0 |
| Schema | `pg.game.v4`, unchanged |
| Production build | Vite build exit 0; fallback base `/`; offline cache 398 assets; version 0.7.0; 82 pinned entries |

`git diff --stat 6ad2c52 e93d4c80` (the code tree under test) is 22 files /
+316 / −50; against the final docs head `8301d646` it is 27 files / +798 / −64.
`git diff e93d4c80 8301d646` is docs only (`CHANGELOG.md`, `RELEASE_STATE.md`, three audit
documents). No production or test code changed after `e93d4c80`. All behavior
was verified on `d8793fc`, `03102c23`, `e93d4c80`, and re-checked on
`8301d646`; the code tree is identical across the last three.

## 2. Pinned authority actually read

The filenames and oldids are the ones present in `docs/official/wiki/` and
named by `docs/rules-matrix.md`.

| Source | Pin read | Sentence verified |
| --- | --- | --- |
| Evil Twin | `Evil_Twin.r3101.wikitext` | “Good can't win if you both live.” / “Good cannot win while both twins are alive. Even if the Demon is killed, the game continues. Good will need to kill the Evil Twin as well as the Demon to win.” |
| Barber | `Barber.r1757.wikitext` | “If you died today or tonight, the Demon may choose 2 players (not another Demon) to swap characters.” / “The Demon may choose not to swap players.” |
| No Dashii | `No_Dashii.r3158.wikitext` | “Your 2 Townsfolk neighbors are poisoned.” / “If a new player becomes the No Dashii, or a poisoned Townsfolk changes into a non-Townsfolk character, the players who are poisoned may change immediately…” |
| Mastermind | `Mastermind.r2993.wikitext` | “If the Demon dies by execution (ending the game), play for 1 more day. If a player is then executed, their team loses.” / “If an evil player is executed or nobody is executed, then the good team wins.” |
| Lunatic | `Lunatic.r3112.wikitext` | “The Lunatic wakes during the first night to learn three bluffs and the appropriate number of Minions, but this information may be wrong.” / “Show any three good character tokens as bluffs. (These can even be characters that are in play.)” |
| Po | `Po.r3104.wikitext` | “Each night*, you may choose a player: they die. If your last choice was no-one, choose 3 players tonight.” |
| Shabaloth | `Shabaloth.r1790.wikitext` | “Each night*, choose 2 players: they die. A dead player you chose last night might be regurgitated.” / “Unlike most Demons, the Shabaloth attacks twice per night.” |
| Rules Explanation | `Rules_Explanation.r1310.wikitext` | “If the Demon dies, good wins. … If just two players are left alive, evil wins.” |
| Glossary | `Glossary.r3168.wikitext` | “Characters have no ability when dead, drunk, or poisoned.” / “Evil wins when just 2 players are alive, not including Travellers.” / “Good wins when the Demon dies.” |

**Pin correction:** the assignment named Shabaloth as `r2991`. The repository
pins `Shabaloth.r1790.wikitext` (`docs/rules-matrix.md`, `BMR-SHABALOTH-01`);
no r2991 snapshot exists in the source set. r1790 was read and used. This is a
correction to the brief, not to the candidate.

## 3. Method and scratch probes

I did not modify production code, tests, or the candidate worktree. Two
scratch probes live in this worktree, untracked and outside the product suite:

- `.audit-probes/probe-compliance.test.ts` — 13 node:test probes for the five
  confirmed defects, regression guards, and the Po/Shabaloth evidence.
- `.audit-probes/win-reason-langs.ts` — scratch Playwright scenario that seeds a
  `mastermind-no-execution` winner and reads `[data-win-reason]` in RU/EN/AZ.

They are not referenced by `package.json`, any tsconfig, or the test manifest.
`node_modules` is the supplied symlink and remains untracked.

Commands were run from this worktree. The RED run used
`git checkout 6ad2c52`, the GREEN run `git checkout d8793fc` (plus the final
head), then `node --test .audit-probes/probe-compliance.test.ts`.

## 4. RED → GREEN evidence

All five engine defects were reproduced with my own probes.

### 4.1 Evil Twin two-alive win (`SNV-EVILTWIN-02`, High)

Probe: deal `clockmaker / eviltwin / fanggu`, set every seat except the two
twins dead, call `checkWin`.

| Tree | Observation |
| --- | --- |
| `6ad2c52` (parent) | `winner === undefined` — no winner; `checkWin` returned `null` at the both-twins branch before the two-alive check. |
| `d8793fc` and `8301d646` | `winner.team === "evil"`, `winner.reason === "two-alive"`. |

Regression guards in the same probe, green on both trees: no Demon and no twin
pair still yields `good / demon-dead`; three living players with both twins and
no Demon still yields no winner (the good-win block survives).

### 4.2 Barber swap with no living Demon (`SNV-BARBER-01`, Medium)

Probes: kill the Fang Gu and the Barber, then `appendConditionalSteps`; and
queue a Barber step while the Demon lives, then kill the last Demon before
`completeStep`.

| Tree | Observation |
| --- | --- |
| `6ad2c52` | `appendConditionalSteps` queued a `barber` step with no living Demon; a stale queued swap still exchanged the two characters. |
| `d8793fc` + | No barber step is appended; a stale queued `completeStep` returns `{ok:true}`, marks the step finished in the caller, and leaves both characters unchanged. |

Regression guard: with a living Demon the barber step is appended and a real
swap still exchanges both characters (green on both trees).

### 4.3 No Dashii duplicate effect id (`SNV-NODASHII-01`, Low–Medium)

Probe: 7-player No Dashii; change its poisoned Townsfolk neighbour to a
non-Townsfolk and reconcile; change it back and reconcile.

| Tree | Observation |
| --- | --- |
| `6ad2c52` | Effect ids `["eff-nodashii-4-3","eff-nodashii-4-5","eff-nodashii-4-2","eff-nodashii-4-3"]` — four records, three unique ids; `validateState` returned `[]`. |
| `d8793fc` + | Ids unique; exactly one record for source `4` / target `3`; `validateState` returns `[]`. |

Regression guard: an unrelated inactive poison (`eff-unrelated-poison`) stays
inactive across reconciliation (green on both trees).

### 4.4 Mastermind no-execution reason (`BMR-MASTERMIND-01`, Low)

Probe: Mastermind extra day armed by a Demon execution, intervening night
skipped, extra day ended with no execution.

| Tree | Observation |
| --- | --- |
| `6ad2c52` | `winner.team === "good"`, `winner.reason === "demon-dead"` (the reason and its detail claimed a Demon inheritance that BMR does not have). |
| `d8793fc` + | `winner.reason === "mastermind-no-execution"`; the engine detail says the extra day ended with no execution; RU/EN/AZ catalogs carry the matching `winReason.mastermind-no-execution`. |

Truthfulness: the new reason is only set in the branch that observes
`state.mastermind.extraDay` with no `state.day.execution`; the existing
execution branch still uses `mastermind`. The pinned “nobody is executed ⇒ good
wins” sentence matches.

### 4.5 Lunatic three bluffs at 5–6 players (`BMR-LUNATIC-01`, Low)

Probe: 6-player BMR `lunatic / grandmother / sailor / moonchild / godfather /
zombuul`, `startNight`, read the first-night note.

| Tree | Observation |
| --- | --- |
| `6ad2c52` | `noteVars = { minions: 1, bluffs: "" }` — zero bluffs; the note ended “3 добрые роли …: —.”. |
| `d8793fc` + | Three distinct good role ids, deterministic from `BMR_ALL` order, preferring absent characters; in-play characters are legal per the pin. |

Regression guard: an 8-player game (the smallest legal BMR count containing the
Outsider Lunatic at 5/1/1/1) keeps the three dealt demon bluffs unchanged.

### 4.6 Po three kills and Shabaloth two kills (evidence gaps)

Both are behavior probes, not defect fixes. They pass on the parent and the
candidate, confirming the implementations were already correct:

- Po r3104: after a no-target night, the next step has `minTargets === 3` and
  `recordBmrOutcome({deathIds:["1","2","4"]})` leaves all three dead.
- Shabaloth r1790: `recordBmrOutcome({deathIds:["2","4","5"]})` is rejected
  (`error.51`); `{deathIds:["2","4"]}` kills exactly two.

### 4.7 Redo control (UI finding F1, Low)

| Tree | Observation |
| --- | --- |
| `6ad2c52` | `dock.tsx` renders `data-act` values `undo, roster, menu, open-secrets, choose-twin-partner`; `ports.ts` has no `canRedo`. |
| `8301d646` | `[data-act="redo"]` exists; `ports.history.canRedo/redo` are wired through `src/entry/main.ts`; the focused `adjudication-persistence` browser case observes disabled → undo → enabled → redo restores the redirect. |

### 4.8 Probe totals

```text
# parent 6ad2c52
node --test .audit-probes/probe-compliance.test.ts
tests 13, pass 7, fail 6
failing: evil twin two-alive, barber no-step, barber stale-swap, no dashii ids,
         mastermind reason, lunatic bluffs

# candidate d8793fc (and 8301d646)
tests 13, pass 13, fail 0
```

## 5. Mandatory checks on the final tree

All commands below were run in this worktree at `8301d646` (code identical to
`e93d4c80`); behavior checks were also run at `d8793fc`.

| Check | Command | Result |
| --- | --- | --- |
| Unit suite | `npm test` | **1541 pass, 0 fail** |
| Typecheck | `npm run typecheck` | exit 0 |
| Lint (repo binary) | `./node_modules/.bin/oxlint src scripts vite.config.ts` | exit 0 |
| Lint (npm) | `npm run verify` under npm 11.6.2 | exit 0 |
| Format | `npm run format:check` | exit 0, 480 files |
| Acceptance | `node scripts/check-acceptance.ts` | 72 matrix roles, 57 test files |
| OpenSpec | `node scripts/openspec-check.ts` | 27 specs, 26 active changes |
| OpenSpec changes | `openspec validate --changes --strict` | 26/26 |
| OpenSpec specs | `openspec validate --specs --strict` | 27/27 |
| Verification gates | `VERIFICATION_BASE_REF=origin/dev node scripts/verification/gates.ts --scope=all` | 523 official / 172 engine / 87 UI, 0 findings |
| Mutation gate | `npm run verification:mutation` | 10/10 critical mutations detected |
| Ownership ledger | `node scripts/role-ownership.ts --check` | current |
| Full verify | `npm run verify` | exit 0 (typecheck, lint, format, tests, build, fallback, offline, source policy, provenance 82, acceptance, version, ownership) |
| Production build | `env -u BASE_PATH npm run build` | exit 0 |
| Fallback / offline | `node scripts/build-fallback.ts --root dist`; `node scripts/build-offline.ts --root dist --out dist/sw.js` | base `/`; 398 assets |
| Version / provenance | `node scripts/check-version.ts`; `node scripts/check-official.ts` | 0.7.0; 82 entries |

### 5.1 Suites

| Command | Result |
| --- | --- |
| `node --test src/core/engine/bmr.test.ts src/core/engine/snv.test.ts src/core/engine/snv-certification.test.ts` | **446 pass, 0 fail** |
| Same six suites plus `crossrole-oracle`, `interactions`, `engine` | **786 pass, 0 fail** |

### 5.2 Full-game scenarios (`BASE_PATH=/pocket/` test build)

Build: `npx vite build --mode test`, fallback, offline; then
`PLAYWRIGHT_MODULE=… node scripts/run-scenarios.ts`.

```text
Scenarios: 10, workers: 3
PASS languages.ts
PASS bmr-15-sailor-zombuul.ts
PASS privacy-player-seat.ts
PASS bmr-15-targets.ts
PASS setup-legal-bags.ts
PASS sv-12-evil-twin.ts
PASS sv-15-roles.ts
PASS sv-15-vortox.ts
PASS tb-15-demon-chain.ts
PASS tb-8-day-powers.ts
10/10 scenarios passed.
```

### 5.3 Browser suite

`PLAYWRIGHT_MODULE=/Users/hose/Programming/home/node_modules/playwright/index.mjs node scripts/browser-check.ts`

```text
PHASE load and identity, fallback matrix, demo isolation, table surface,
      script switching, bag, manual play, role steps, console dialogs,
      privacy and seat, routes and sheet, offline and update, phone acceptance
PASS 37 named cases
Browser checks passed: phone/tablet, night/day, Virgin, route cleanup, privacy,
      reload, cross-tab, languages, native role sheet, dialog contract,
      offline project-subpath reload, fast PWA update.
```

Exit 0, 13 phases, 37/37 named. The focused cases named by the assignment were
also run individually with `PG_BROWSER_CHECK` and `PG_SKIP_BUILD=1`:
`adjudication-persistence`, `pithag-deaths`, `tinker-first-night`,
`dreamer-pair`, `evil-twin-introduction`, `vortox-label`,
`cerenovus-privacy` — **7/7 PASS**.

Known flake: one earlier full-suite run failed in the `offline and update`
phase with `page.evaluate: Execution context was destroyed` at the cross-tab
reload/activation step; the immediate rerun and a later run both passed. The
source comments already acknowledge this activation/reload race. It is a
test-harness race, not a reproduced application failure.

### 5.4 Locale render of the new reason

Scratch scenario `.audit-probes/win-reason-langs.ts` (test build, real
`/pocket/table`) seeds the winner and reads `[data-win-reason]`:

```text
SCENARIO PASS win-reason-langs
ru: Кукловод дал лишний день, но в этот день никого не казнили, поэтому побеждает добро.
en: The Mastermind's extra day ended with no execution, so good wins.
az: Kuklovod əlavə gün verdi, amma həmin gün heç kim edam olunmadı, ona görə xeyir qalib gəlir.
```

Catalog check: `missingTranslations()` is empty for all three catalogs,
`translationProblems()` is empty, and `t("winReason.mastermind-no-execution")`
resolves (no raw key) in ru/en/az.

## 6. Fix-quality audit (no test, gate, or scope weakening)

- **Diff scope:** the only production changes are
  `bmr.ts` (Lunatic fallback), `day.ts` (Mastermind reason), `death.ts`
  (Evil Twin two-alive + new detail), `sv.ts` (Barber chooser guard + No Dashii
  record revival), the redo wiring, and the locale/Spec/doc updates. No rule
  was removed, no threshold relaxed, no command disabled.
- **Tests:** the diff removes only 14 lines from tests: two Mastermind
  assertions changed from `demon-dead` to the truthful
  `mastermind-no-execution` (matching the pin), and the
  Philosopher/borrowed-Barber test was **strengthened** from “the step exists”
  to “the borrowed swap actually exchanges both characters.” No test was
  deleted or made less specific. The new certification tests assert engine
  state (`checkWin` result, queue absence, role swap, effect ids,
  `validateState`), not log strings.
- **Gates/manifest:** `test-manifest.json` gains exactly five entries;
  `traceability.json` and `ui-contracts.json` update only UI-078 (Undo → Undo
  and redo) with no status downgrade; `SPEC.md` corrects the stale
  voter-list sentence to the shipped vote-count control. No coverage row was
  removed.
- **Architecture:** the new test imports the public engine surface
  (`./index.ts`, `../model/*`); no private hook or production escape hatch was
  added. `check-types-policy` and the role-ownership ledger pass.
- **Evil Twin unrelated wins:** probe-confirmed no change when there is no twin
  pair and no change to the both-live block above two alive.
- **Barber legal swap:** probe-confirmed a living Demon still gets the step and
  the swap.
- **No Dashii unrelated poison:** probe-confirmed an unrelated inactive poison
  is not revived.
- **Mastermind reason truthfulness:** `mastermind-no-execution` is set only by
  the no-execution branch; the execution branch keeps `mastermind`.
- **Lunatic determinism/legality:** the fallback iterates `BMR_ALL`,
  prefers roles not in play, slices three, and is gated off for the legacy
  ruleset so old journal notes replay byte-identically. The pin explicitly
  allows in-play characters.
- **Barber chooser impairment:** a living but drunk/poisoned Demon is still
  offered the Barber swap (the guard checks only “living Demon”). This
  behavior predates the fix; the pin does not explicitly address an impaired
  *chooser* (the dead Barber owns the ability). Recorded as a residual
  discretion boundary, not a reproduced defect.
- **No Dashii legacy duplicates:** the fix prevents new duplicates and revives
  the first matching record; an imported save that already contains duplicate
  ids would keep them. No such save is produced by the certified code.

## 7. UI reachability, privacy, replay, offline, locales

Verified through the real built `/table` route (test mode exposes
`window.PG_MODULES`; the production artifact was also built and version-checked).

| Claim | Evidence | Result |
| --- | --- | --- |
| Undo/redo through the dock | `adjudication-persistence` focused case: disabled redo, undo restores pre-redirect state, redo reapplies, continuation lifecycle/reload passes | PASS |
| Mayor redirect | `mayor-redirect` + `adjudication-persistence` | PASS |
| Pacifist survival | `pacifist-survival` (unchecked by default) | PASS |
| Tinker death | `tinker-first-night`, `tinker-night` | PASS |
| Madness penalty | `madness-execution` + `cerenovus-privacy` | PASS |
| Pit-Hag change / arbitrary deaths | `pithag-deaths` | PASS |
| Evil Twin pairing / introduction | correction `[data-correct="twin-value"]` path exercised in `browser-check.ts`; `evil-twin-introduction` privacy case | PASS |
| Privacy of hidden roles/notes/pairs | `privacy and seat` phase, `dreamer-pair`, `evil-twin-introduction`, `cerenovus-privacy` | PASS |
| Replay / reload | `adjudication-persistence`, `heir-reload`, royalty/journal phases | PASS |
| Offline / PWA update | `offline and update` phase (rerun) | PASS |
| RU/EN/AZ | language phase + new-reason scratch scenario + catalog parity | PASS |
| Mobile | `phone acceptance` at 360×640 and 640×360 | PASS |

The five consequential choices named by the assignment are all reached through
real controls; none is preselected, and each records its host decision.

## 8. Rejected or qualified claims

1. **“Shabaloth r2991.”** Rejected; the repo pin is r1790. r2991 is absent.
2. **`browser-check` is a “production artifact” run** (both acceptance
   reports). Qualified: `scripts/browser-check.ts` builds a private
   `--mode test` artifact with `BASE=/pocket/` and `window.PG_MODULES`. It is
   the same UI code, but it is not the production entry. The production
   artifact evidence is the separate UI-auditor script in
   `grimoria-audit-ui` (15/15), which I did not re-execute because it is not in
   this branch; I did build the production artifact and verify version and
   provenance, and re-ran the same selector paths through the repo suite.
3. **“Remaining evidence gaps: 0”** (beta-removal decision). Qualified: no
   confirmed *mechanical* gap remains, but the independent S&V audit still
   lists host-duty/out-of-scope residuals (Vortox/Artist free-form answer, a
   second Juggler holder's convenience zero, Town Crier cancelled nomination,
   Witch suppression vs. deletion, Pit-Hag “protect” having no first-class
   record, Fang Gu protected-target test using a mixed deal, Evil Twin corpse
   execution corner). These are disclosed, not unimplemented mechanics.
4. **“Independent production UI script 15/15”** (S&V acceptance). Not
   independently re-run here; accepted only as a prior audit claim. My own
   evidence is the repo browser suite plus focused cases.
5. **Intermediate-candidate churn.** At `9f49425`, `npm test` failed the new
   six-player Lunatic test (`isGoodRole` on ids split from `"chambermaid,
   courtier, exorcist"` without trimming), and `format:check` failed on the two
   new test files. `72a20eb` trims the ids and `03102c2` formats the files; the
   final head is green. This is a process note, not a defect at the certified
   head.
6. **Lint under this session's `npm` shim.** `/Users/hose/.local/bin/npm`
   (12.2.0) prints `ESLint output (JSON parse failed…)` and exits 1 for
   `npm run lint`; `/usr/local/bin/npm` (11.6.2, login shell) and the repo's
   own `oxlint` binary both exit 0, and `npm run verify` passes. This is a
   harness shim artifact, not a candidate failure.

## 9. Residual risks

- Setup composition counts are not present in a pinned Wiki snapshot; the
  engine table matches the published sheet and is test-exercised. `Setup.r1361`
  only pins that 5–6 players are legal but not recommended.
- Night order comes from the committed `docs/official/nightsheet.json`, not
  Wiki text (the page uses an image).
- Pukka self-target is a disclosed host-adjudicated extrapolation.
- Barber chooser impairment is not gated (see §6).
- No Dashii legacy duplicate ids in an already-imported save are not cleaned.
- Evil Twin corpse-execution corner is not newly asserted.
- Undo history still resets on a full reload (journal replay and redo remain);
  disclosed by the UI audit (F4).
- Travellers, Fabled, Loric, jinxes and mixed-edition automatic play remain
  explicit manual boundaries.
- The browser suite's cross-tab PWA activation step flaked once and passed on
  rerun; treat the first failure as harness flake unless it recurs.

## 10. Verdicts

### Bad Moon Rising — **PASS**

- All 25 characters accounted for against pinned text (49 rule rows; 45
  verified, 4 legal host-choice) — `docs/audits/bmr-production-acceptance.md`,
  re-derived from the engine roster and the BMR suite.
- Both confirmed defects (Mastermind reason, 5–6 Lunatic bluffs) reproduced RED
  at `6ad2c52` and GREEN at `d8793fc`; the Po and Shabaloth evidence gaps are
  closed and their behavior independently probe-confirmed.
- No critical/high defect remains. Host choices exercised through production
  controls; privacy, replay, undo/redo, reload, offline and RU/EN/AZ verified.
- Every exception is explained; all mandatory checks pass on the final tree.

### Sects & Violets — **PASS**

- All 25 characters accounted for against pinned text (53 rule rows; 41
  verified, 12 legal host-choice).
- All three confirmed defects (Evil Twin two-alive, Barber no-living-Demon,
  No Dashii duplicate ids) reproduced RED at `6ad2c52` and GREEN at `d8793fc`,
  with regression guards; the borrowed-Barber gap is closed end-to-end.
- No critical/high defect remains. The five named consequential choices, Evil
  Twin pairing, privacy, replay, undo/redo, reload, offline and RU/EN/AZ are
  verified on the final tree.
- Every exception is explained; all mandatory checks pass on the final tree.

No claim above was accepted without a command or probe run in this worktree,
except where explicitly marked as a prior audit claim (item 8.4).

## 11. Reproduction

```sh
cd /Users/hose/Programming/grimoria/grimoria-audit-compliance
git fetch ../grimoria-bmr-snv-audit chore/bmr-snv-certification
git checkout -B verify 8301d64648a6c69f0cf5e407b8f3efaf8734ce00

# RED (parent)
git checkout 6ad2c52
node --test .audit-probes/probe-compliance.test.ts     # 7 pass / 6 fail
# GREEN (fix)
git checkout d8793fc
node --test .audit-probes/probe-compliance.test.ts     # 13 pass / 0 fail

git checkout verify
npm test
npm run typecheck
npm run format:check
./node_modules/.bin/oxlint src scripts vite.config.ts
node scripts/check-acceptance.ts
node scripts/openspec-check.ts
openspec validate --changes --strict
openspec validate --specs --strict
VERIFICATION_BASE_REF=origin/dev node scripts/verification/gates.ts --scope=all
npm run verification:mutation

# pocket scenarios
BASE_PATH=/pocket/ npx vite build --mode test
PLAYWRIGHT_MODULE=…/playwright/index.mjs node scripts/run-scenarios.ts
PLAYWRIGHT_MODULE=…/playwright/index.mjs node scripts/browser-check.ts

# locale render of the new reason
PLAYWRIGHT_MODULE=…/playwright/index.mjs node .audit-probes/win-reason-langs.ts
```

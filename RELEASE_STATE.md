# Release state

Canonical handoff for epic #200 and release 0.6.0. Updated 2026-11-20.

- Release PR: #366 (`dev` → `main`), owner-controlled. Do not merge, tag or close parent issues without the owner's decision.
- Baseline `dev`: `40f6830cbffb762bc154ac01764fb082e376a066`.
- Current defect-fix branch: `fix/release-defect-reachability`, based on `40f6830`; PR #421.
- OpenSpec change: `release-defect-reachability`.

## Current exact-branch evidence

Everything in this section was run on the defect-fix branch, not carried over from the baseline.

| Check | Result |
| --- | --- |
| `npm test` | 1386/1386 pass |
| `npm run verify` | pass (typecheck, lint, format, tests, build, fallback, offline, source policy, provenance 82, acceptance 72 roles / 52 files, version, ownership) |
| `node scripts/openspec-check.ts` | pass, 27 specs / 12 active changes |
| `openspec validate --changes --strict` | 12/12 pass |
| `PG_BROWSER_CHECK=pithag-deaths` | pass on `/table` at 390 px |
| `PG_BROWSER_CHECK=tinker-first-night` | pass on `/table` at 390 px |
| `PG_BROWSER_CHECK=journal-pairs` | pass on `/table` at 390 px |
| Full `node scripts/browser-check.ts` | pass: 30 focused/contract cases plus phone acceptance, offline update and all three new checks |

Browser evidence uses the built production artifact and the real `/table` route. Focused checks are also registered in the full suite.

## Confirmed defects closed on this branch

### Pit-Hag arbitrary deaths (SNV #219)

- Pinned source: Pit-Hag r2998, `docs/official/wiki/Pit-Hag.r2998.wikitext`.
- First divergent layer: UI condition. `canKill` becomes true only inside the completion, after the one-shot console payload is built.
- Fix: `canMarkStepDeaths` exposes the marking control when the draft names a not-in-play Demon; the engine keeps the official guard.
- Negative case: an in-play character hides the control, and a forced death preview is rejected with `error.51`.
- Browser proof: target and role chosen through real controls, death marked, command confirmed, state read back.
- Consequences: target becomes `nodashii`, the victim dies, the journal replays to the identical canonical state, undo restores both seats, redo reapplies.

### Tinker first-night death (BMR #218)

- Pinned source: Tinker r1782, `docs/official/wiki/Tinker.r1782.wikitext` — "You might die at any time."
- First divergent layers: the role's night-step arm declared `timing: "other"`, and the queue had no first-night host step.
- Fix: the arm is `timing: "any"`; `buildBmrNightQueue` appends the Tinker host step outside the printed order, so later step keys do not shift.
- Compatibility: `FIRST_NIGHT_TINKER_RULESET_VERSION` keeps older journals on their recorded queue; the Tinker replay fixtures still pass.
- Negative case: a good Tea Lady neighbour protects the Tinker; the marked death is prevented and no death is recorded.
- Browser proof: night 1 opens on the Tinker step, the death control is reachable, the death is recorded, the step advances, and the winner stays unset.

### Dreamer/Sage journal inspection (SNV #219)

- Pinned source: Dreamer r2904 and Sage r3009, `docs/official/wiki/Dreamer.r2904.wikitext`, `docs/official/wiki/Sage.r3009.wikitext`.
- First divergent layer: the side panel sliced `state.log` to the last eight lines before rendering, with no route to the older history.
- Fix: `EventLog` keeps the eight-line preview and offers the full journal; each entry exposes its host-choice case.
- Source of truth: `state.log`, written by the existing command flow; the pairs are not recomputed in the UI.
- Privacy: both pairs remain absent from `publicGameView`; the history stays in the Storyteller menu.
- Browser proof: two recorded pairs sit beyond the preview, remain hidden in the preview, appear after expansion, and survive reload; both journals replay with their pair entries.

## Consequential choice inventory (#216)

Every mechanical choice named in #216 now has a production `/table` path and a
shared engine writer. Reload or undo is explicit only where the last column
says so; the others rely on the store/replay suites, not a per-choice browser
reload.

| Choice | Production browser check | Engine writer | Reload / undo / replay |
| --- | --- | --- | --- |
| Mayor redirect | `mayor-redirect` | `resolveAttack` / `mayorRedirects` | preview/apply tests; no per-choice reload |
| Demon heir | `heir-question`, `heir-sheet`, `heir-reload` | `chooseDemonHeir` | explicit reload |
| Pacifist survival | `pacifist-survival` | `executeByDecision` | preview/apply tests; no per-choice reload |
| Tinker death | `tinker-first-night`, `tinker-night` | `recordBmrOutcome` | engine replay; first-night rollback not browser-tested |
| Cerenovus/Mutant madness | `madness-execution`, `cerenovus-privacy` | `applyMadnessPenalty` | engine replay; no per-choice reload |
| Evil Twin pairing | `role-corrections` | `manualCorrection` | `evil-twin-choice.test.ts` replay and undo |
| Slayer x Recluse | `drunk-slayer` | `useSlayer` | preview/apply tests; no per-choice reload |
| Pit-Hag arbitrary deaths | `pithag-deaths` | `recordSvOutcome` | journal replay, undo and redo in the browser |

Residual #216 work: add the missing per-choice browser save/reload and undo
proofs, then record the exact legal-option matrix. No unmodelled mechanical
consequence is known after this branch.

## Historical evidence (not current-branch proof)

These results were collected on `dev` `40f6830` and are still the baseline for the release tree. They do not prove the defect fixes above.

- PR #420 CI: all jobs green, including Specifications, findings and traceability.
- `npm test` on `40f6830`: 1385/1385.
- `npm run verify` on `40f6830`: pass.
- `VERIFICATION_BASE_REF=origin/dev gates.ts --scope=all`: 523 official rules, 167 engine rules, 87 UI contracts, 0 recorded findings.
- `npm run verification:mutation`: 10/10 mutations detected.
- Atomic coverage: 230 verified, 1 partial, 292 `ROLE_LEVEL_ONLY` of 523 sentence-level rules.
- Independent TB/BMR/S&V audits: #217, #218, #219; the audits found defects in rows already marked verified.

## Epic status

| Issue | Status |
| --- | --- |
| #211 capability migration | Partial; 36 capability-plus-engine-reference roles, 30 engine-branch roles. Remaining rows are not independently validated. |
| #216 Storyteller adjudication and privacy | Journal pair inspection and privacy now covered; the rest of the adjudication surface needs its own pass. |
| #217 TB acceptance | Independent audit evidence exists; final integrated acceptance remains open. |
| #218 BMR acceptance | Tinker first-night gap closed here; final integrated acceptance remains open. |
| #219 S&V acceptance | Pit-Hag reachability and journal pair inspection closed here; final integrated acceptance remains open. |
| #220 cross-role and model-based verification | Baseline model and cross-role suites pass; no new evidence on this branch. |
| #221/#332 atomic traceability | 230 verified, 1 partial, 292 role-level; the remaining sentence mappings need review. |
| #222 persistence, replay and rollback | Baseline suites pass; the three new outcomes replay and undo in the browser checks. |
| #223 final integrated acceptance | Open. Requires the release tree to include this branch and a fresh exact-HEAD run. |

## Owner decisions

1. Merge PR #366 only after the defect-fix branch lands on `dev` and the release PR's evidence is refreshed.
2. Approve the release tag `v0.6.0` and the Pages smoke test.
3. Decide whether the remaining 292 role-level rules and the 1 partial row must be sentence-mapped before release, or whether the documented limitation is acceptable.
4. Resolve the Pukka self-target source ambiguity (#313/#218/#219) as a documented host-adjudicated default or a new rules decision.

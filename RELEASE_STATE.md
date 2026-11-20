# Release state

Canonical handoff for epic #200 and release 0.6.0. Updated 2026-11-20.

- 0.6.0 is merged on `main` at `f7aba4f0111f4300bb326a402e9514ad0bab05ab` (owner merge of #366). Do not modify `main` or create a tag without a new owner instruction.
- Current code evidence base: `dev` `5640add` (after #424–#428). A later docs-only commit may move the branch head; this SHA names the code tree the evidence was taken on.
- Previous baseline: `40f6830cbffb762bc154ac01764fb082e376a066`.
- 0.6.0 tree: the three defect fixes (#421), release-state #422 and the serve-dist harness fix (#423).
- Post-0.6.0 `dev` evidence: #424 adjudication persistence, #425 S&V/shared atomic mappings, #426 per-script acceptance, #427 Clockmaker/Oracle capability slice, #428 TB/BMR atomic mappings.

## Current `dev` evidence (`5640add`)

Everything in this section is current on the merged `dev` tree, not carried over from 0.6.0.

| Check | Result |
| --- | --- |
| `npm test` | 1397/1397 pass |
| `npm run verify` | pass (typecheck, lint, format, tests, build, fallback, offline, source policy, provenance 82, acceptance 72 roles / 52 files, version, ownership) |
| `npm run verification:mutation` | 10/10 critical mutations detected |
| `node scripts/openspec-check.ts` | pass, 27 specs / 13 active changes |
| `openspec validate --changes --strict` | 13/13 pass |
| `VERIFICATION_BASE_REF=origin/dev gates --scope=all` | pass, 0 findings |
| Atomic coverage | 254 verified, 12 partial (host-choice), 257 `ROLE_LEVEL_ONLY` of 523; 266 atomic entries |
| Browser suite | 51 cases, including `adjudication-persistence`, `pithag-deaths`, `tinker-first-night`, `journal-pairs` |
| Ownership ledger | 36 capability + engine reference, 30 engine branch, 5 capability-only, 1 shared |

Browser evidence uses the built production artifact and the real `/table` route. Focused checks are also registered in the full suite.

- PR #424 CI green: Mayor, Pacifist, madness and Slayer decisions applied through `/table`, replay, undo/redo, reload, replay again.
- PR #425 and #428 CI green: 35 reviewed atomic mappings, each with a named test assertion; 98 + 127 sentences stay role-level with reasons.
- PR #426 records the independent TB/BMR/S&V acceptance report (`docs/audits/per-script-acceptance-2026-11-20.md`).
- PR #427 CI green: Clockmaker and Oracle answers moved to information capabilities with byte-identical stored records.
- #423 fixed the scenario harness half-sent 404 when a fresh build lacks `404.html`.

## Confirmed defects closed on `dev` (`3a385b4` and later)

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

Every mechanical choice named in #216 now has a production `/table` path, a
shared engine writer, and a fail-closed browser proof where listed.

| Choice | Production browser check | Engine writer | Reload / undo / replay |
| --- | --- | --- | --- |
| Mayor redirect | `mayor-redirect`, `adjudication-persistence` | `resolveAttack` / `mayorRedirects` | apply, journal replay, undo/redo, reload, replay |
| Demon heir | `heir-question`, `heir-sheet`, `heir-reload` | `chooseDemonHeir` | explicit reload |
| Pacifist survival | `pacifist-survival`, `adjudication-persistence` | `executeByDecision` | apply, journal replay, undo/redo, reload, replay |
| Tinker death | `tinker-first-night`, `tinker-night` | `recordBmrOutcome` | engine replay; first-night rollback not browser-tested |
| Cerenovus/Mutant madness | `madness-execution`, `cerenovus-privacy`, `adjudication-persistence` | `applyMadnessPenalty` | apply, journal replay, undo/redo, reload, replay |
| Evil Twin pairing | `role-corrections` | `manualCorrection` | `evil-twin-choice.test.ts` replay and undo |
| Slayer x Recluse | `drunk-slayer`, `adjudication-persistence` | `useSlayer` | apply, registration persisted, journal replay, undo/redo, reload, replay |
| Pit-Hag arbitrary deaths | `pithag-deaths` | `recordSvOutcome` | journal replay, undo and redo in the browser |

Residual #216 work: the Tinker first-night browser rollback proof and the exact
legal-option matrix. No unmodelled mechanical consequence is known.

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
| #211 capability migration | Clockmaker and Oracle answers moved to `information` capabilities (#427). 36 capability-plus-engine-reference roles, 30 engine-branch roles; five S&V information roles and the who-wakes slices remain. |
| #216 Storyteller adjudication and privacy | Four residual mechanical choices now have apply → replay → undo/redo → reload → replay proofs (#424). Tinker first-night rollback and the legal-option matrix remain. |
| #217 TB acceptance | Independent report merged (#426); final `main` acceptance remains owner-controlled. |
| #218 BMR acceptance | Tinker first-night and the independent report merged; final `main` acceptance remains owner-controlled. |
| #219 S&V acceptance | Pit-Hag reachability, journal pairs and the independent report merged; final `main` acceptance remains owner-controlled. |
| #220 cross-role and model-based verification | Baseline model and cross-role suites pass; no new independent oracle yet. |
| #221/#332 atomic traceability | 254 verified, 12 partial, 257 role-level of 523; 266 atomic entries. 35 new mappings have named test evidence; the two reviewed proposals covered 260 assigned sentences, and 225 of those remain role-level. |
| #222 persistence, replay and rollback | Adjudication persistence proofs merged (#424); legacy journals and store suites pass. |
| #223 final integrated acceptance | 0.6.0 merged on `main` `f7aba4f`; #200/#223 remain open for the post-0.6.0 capability, atomic and independent-acceptance work. |

## Owner decisions

1. 0.6.0 is merged; tag `v0.6.0` and Pages smoke are owner operations.
2. Decide whether the remaining 257 role-level rules and 12 partial rows are acceptable for #200 closure, or require further sentence mapping.
3. Preserve the Pukka self-target source ambiguity (#313/#218/#219); do not invent a ruling.
4. Decide whether the remaining #211 migration slices are required before #200 closure.

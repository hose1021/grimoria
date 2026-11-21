# Release state

Canonical handoff for epic #200, release candidate 0.8.0. Updated 2026-11-21.

## Current state — 0.8.0 release candidate

- Released `main`: `aa1e11b912bbd755a2b653dcb8966e54512b893b` (0.7.0, Pages succeeded). Owner-only; do not merge, tag or publish automatically.
- Integration `dev`: `8760c53d1a346c30be18d094e9d9dc0bd66d5be1`, including #468 mobile bag, #469 independent BMR/S&V certification, and #470 BETA-removal regression. This SHA is the pre-release baseline, not the release PR head.
- Release candidate is prepared on `release-0.8.0`, targeting `main`; `VERSION`, `package.json` and `CHANGELOG.md` agree on 0.8.0. Candidate must pass required PR CI on its exact HEAD; no release/merge/tag has occurred as part of preparation.
- BMR/S&V certification: 25 characters per edition; audit reports `docs/audits/bmr-production-acceptance.md`, `docs/audits/snv-production-acceptance.md`, `docs/audits/compliance-signoff.md` and `docs/audits/beta-removal-decision.md`. Certified code tree `e93d4c80267380198bdd1bc1268b44bff0a8dfff`; #469 GitHub checks passed at `ff45b3999b7c6000ca4d9273d4818c7ac3d5172d`. Independently confirm release-branch checks; do not transfer their status automatically.
- Reported certification tests: 1,541 unit tests; 10/10 full-game scenarios; 37/37 named browser checks; 10/10 mutation detections; rule verification gates 523 official / 172 engine / 87 UI, zero findings on the certified tree.
- Rule readiness matrix inherited from 0.7.0: 392 verified, 24 host-choice partial, 95 documented non-mechanical exceptions, 0 registered mechanical gaps, 12 covered without a unique owner, 0 unmapped. These figures are not a claim of complete independent verification.
- Scoped boundaries: Pukka self-target adjudication, free-form Artist/Vortox truthfulness, cross-edition jinxes, Traveller/Fabled/Loric mechanics and session-only undo history are documented; saved game and canonical journal remain persistent.
- #200 and #223 stay OPEN until integrated `main` acceptance, production Pages smoke, privacy/offline/replay evidence and an explicit owner closure decision. This 0.8.0 release is not 1.0.0 and does not imply unrestricted automatic play.

## Release checklist (owner-controlled)

- [x] #469 merged into dev; #470 merged into dev; BMR and S&V BETA labels removed in candidate.
- [x] Version files and changelog prepared for 0.8.0.
- [ ] Exact-head release PR CI, specifications, provenance, verification gates, full-game and Playwright browser checks pass.
- [ ] Owner reviews and merges the 0.8.0 PR into main.
- [ ] Post-merge Pages deployment and production smoke, locale, offline update, privacy, replay and pg.game.v4 verified on final main SHA.
- [ ] Tag/GitHub Release only by owner action; #223 and then #200 close only with explicit acceptance.

## Historical baselines (do not treat as current)

The sections below describe the 0.6.0 baseline and earlier evidence. They are historical where this section gives a newer SHA or count.

- 0.6.0 is merged on `main` at `f7aba4f0111f4300bb326a402e9514ad0bab05ab` (owner merge of #366). Do not modify `main` or create a tag without a new owner instruction.
- Current code evidence base: `dev` `47f9d38` (after #424–#444). A later docs-only commit may move the branch head; this SHA names the code tree the evidence was taken on.
- Previous baseline: `40f6830cbffb762bc154ac01764fb082e376a066`.
- 0.6.0 tree: the three defect fixes (#421), release-state #422 and the serve-dist harness fix (#423).
- Post-0.6.0 `dev` evidence: #424 adjudication persistence, #425 S&V/shared atomic mappings, #426 per-script acceptance, #427 Clockmaker/Oracle capability slice, #428 TB/BMR atomic mappings, #429 state handoff, #430 Tinker persistence, #431 Mathematician capability, #432 shared-rule tests, #433 cross-role replay/undo, #435 ownership CI, #436 verify pipeline, #437 Flowergirl/Town Crier capability, #439 #211 inventory, #440 Juggler wake, #441 Philosopher/Seamstress/Witch wakes, #443 death-step capability + Klutz, #444 Barber/Sage/Sweetheart death steps.

## Current `dev` evidence (`47f9d38`)

Everything in this section is current on the merged `dev` tree, not carried over from 0.6.0.

| Check | Result |
| --- | --- |
| `npm test` | 1435/1435 pass |
| `npm run verify` | pass (typecheck, lint, format, tests, build, fallback, offline, source policy, provenance 82, acceptance 72 roles / 52 files, version, ownership) |
| `npm run verification:mutation` | 10/10 critical mutations detected |
| `node scripts/openspec-check.ts` | pass, 27 specs / 19 active changes |
| `openspec validate --changes --strict` | 19/19 pass |
| `VERIFICATION_BASE_REF=origin/dev gates --scope=all` | pass, 0 findings; 172 engine rules |
| Atomic coverage | 260 verified, 12 partial (host-choice), 251 `ROLE_LEVEL_ONLY` of 523; 272 atomic entries |
| Browser suite | 51 cases, full pass on `1ed5568`, including `adjudication-persistence`, `pithag-deaths`, `tinker-first-night`, `journal-pairs` |
| Ownership ledger | 44 capability + engine reference, 22 engine branch, 5 capability-only, 1 shared |

Browser evidence uses the built production artifact and the real `/table` route. Focused checks are also registered in the full suite.

- PR #424 CI green: Mayor, Pacifist, madness and Slayer decisions applied through `/table`, replay, undo/redo, reload, replay again.
- PR #425 and #428 CI green: 35 reviewed atomic mappings, each with a named test assertion.
- PR #426 records the independent TB/BMR/S&V acceptance report (`docs/audits/per-script-acceptance-2026-11-20.md`).
- PR #427 CI green: Clockmaker and Oracle answers moved to information capabilities with byte-identical stored records.
- PR #430 CI green: the first-night Tinker death now has replay, undo, redo, reload and post-reload replay proof.
- PR #431 CI green: the Mathematician answer moved to an information capability; 1402 tests at that point.
- PR #432 CI green: six shared sentences now have behavioral tests and atomic mappings; 172 engine rules.
- PR #433 CI green: Pit-Hag, Barber, Snake Charmer, Slayer and Mastermind replay/undo paths all reproduce the canonical state.
- PR #435 CI green: the role-ownership test now matches the migrated ledger and runs in CI.
- PR #436: `npm run verify` now runs the ownership and serve-dist tests locally.
- PR #437 CI green: Flowergirl and Town Crier answers moved to information capabilities.
- PR #440 CI green: the Juggler wake moved to a `night-step` capability.
- PR #441 CI green: Philosopher, Seamstress and Witch wakes moved to `night-step` capabilities.
- PR #443 CI green: `death-step` capability and `deathStepOf`; Klutz migrated.
- PR #444 CI green: Barber, Sage and Sweetheart death steps migrated; 1435 tests, OpenSpec 19.
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
| Tinker death | `tinker-first-night`, `tinker-night` | `recordBmrOutcome` | apply, journal replay, undo/redo, reload, replay (#430) |
| Cerenovus/Mutant madness | `madness-execution`, `cerenovus-privacy`, `adjudication-persistence` | `applyMadnessPenalty` | apply, journal replay, undo/redo, reload, replay |
| Evil Twin pairing | `role-corrections` | `manualCorrection` | `evil-twin-choice.test.ts` replay and undo |
| Slayer x Recluse | `drunk-slayer`, `adjudication-persistence` | `useSlayer` | apply, registration persisted, journal replay, undo/redo, reload, replay |
| Pit-Hag arbitrary deaths | `pithag-deaths` | `recordSvOutcome` | journal replay, undo and redo in the browser |

Residual #216 work: none of the named mechanical consequences is unproven. The
legal-option matrix below records the accepted and refused choices.

### Legal-option matrix

| Choice | Legal options | Rejected or no-effect | UI gate |
| --- | --- | --- | --- |
| Mayor redirect | Only when a living, unimpaired Mayor would die from the Imp. Any other seat may be named, including a dead, protected or Soldier seat; naming the Mayor or an unknown seat cancels the redirect. "None" leaves the Mayor as the victim. | No redirect answer blocks the step; a redirect to a dead/protected seat records no death instead of a kill. | `select[data-redirect]` |
| Demon heir | A living Minion when the Imp died and the Scarlet Woman did not inherit. | Dead players, non-Minions and an absent pending inheritance. | HeirChoice dialog |
| Pacifist survival | A good player executed by the day decision while a living, unimpaired Pacifist is in play. | Evil targets and non-execution deaths. | `[data-exec-survives]` |
| Tinker death | The living Tinker whose true ability works. | Dead, Drunk/poisoned or protected Tinker; only the Tinker may be marked on its step. | `[data-tinker-decision]` |
| Madness penalty | `execute` or `none`, with a reason; the mad player is the target. | Unknown penalty, empty reason, closed day, a token assigned this night. | `[data-madness-action]`, `[data-madness-reason]` |
| Evil Twin pairing | The Evil Twin holder and a living partner of opposing real alignment; a mid-game holder keeps its stored ids. | Non-S&V script, non-holder, dead partner, same real alignment. | correction `kind: twin` |
| Slayer shot | A living Slayer with the ability and an unused shot; any target; Recluse may register as the Demon. | Missing/dead/not-Slayer, already used, unknown target. | `[data-slayer-target]`, `[data-recluse-slayer]` |
| Pit-Hag change | Any existing target and a supported in-script character not in play; a created Demon opens the arbitrary-death control. | Missing target, missing/out-of-script character, impaired no-op; in-play character is a legal no-op. | target + `[data-bmr-role]`, then `[data-bmr-decision="marking"]` |

All eight validate the option set, apply through the shared writer, journal a
secret reason where required and replay deterministically. No unmodelled
mechanical consequence is known.

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
| #211 capability migration | Information: Clockmaker, Oracle, Mathematician, Flowergirl, Town Crier (#427, #431, #437). Night-step wake: Juggler, Philosopher, Seamstress, Witch (#440, #441). Death-step: Klutz, Barber, Sage, Sweetheart (#443, #444). Remaining: Dreamer/Evil Twin answer ownership. Shared coordinator references stay central. |
| #216 Storyteller adjudication and privacy | All eight mechanical choices have a production path, and each has replay/undo evidence; the four residual choices (#424) and the Tinker (#430) have browser apply → replay → undo/redo → reload → replay. The legal-option matrix is recorded above. |
| #217 TB acceptance | Independent report merged (#426); final `main` acceptance remains owner-controlled. |
| #218 BMR acceptance | Tinker first-night and the independent report merged; final `main` acceptance remains owner-controlled. |
| #219 S&V acceptance | Pit-Hag reachability, journal pairs and the independent report merged; final `main` acceptance remains owner-controlled. |
| #220 cross-role and model-based verification | The independent audit mapped the named high-risk matrix; five missing replay/undo paths are now covered (#433). A fully independent source-derived oracle remains open. |
| #221/#332 atomic traceability | 260 verified, 12 partial, 251 role-level of 523; 272 atomic entries. 41 new mappings have named test evidence (35 role proposals + 6 shared); 225 assigned role sentences remain role-level with recorded reasons. |
| #222 persistence, replay and rollback | Adjudication persistence (#424), Tinker first-night (#430) and five cross-role replay/undo paths (#433) merged; legacy journals and store suites pass. |
| #223 final integrated acceptance | 0.6.0 merged on `main` `f7aba4f`; #200/#223 remain open for the post-0.6.0 capability, atomic and independent-acceptance work. |

## Remaining #211 inventory

| Slice | Roles | Why it is not a mechanical copy | Required decision |
| --- | --- | --- | --- |
| Information answer ownership | Dreamer, Evil Twin | The Dreamer must ask the host even when one pair is legal and carries `requiresInfoPair` replay semantics; `InformationDecision.answer` has no `hostAnswer` and the script-scoped character pool is not a fact yet. The Evil Twin answer is a prepared pair note, not a scalar answer. | Approve a decision-shape/context extension, or defer both. |
| Night-step wake contract | Juggler, Philosopher, Seamstress, Witch | Moved to `night-step` capabilities; behavior unchanged (#440, #441). | Done. |
| Death-step wake contract | Klutz, Barber, Sage, Sweetheart | `death-step` capability and `deathStepOf` added (#443); all four roles migrated (#443, #444). | Done. |
| Shared coordinator references | any role whose only references are `effects.ts`, `death.ts`, `setup.ts`, `information-facts.ts`, `model/state.ts`, `corrections.ts` or `host-choice.ts` | These are shared mechanics, not role-specific answer logic. The generated ledger keeps them visible. | Confirm they stay documented shared exceptions. |

The five migrated information roles have byte-identical stored records and pass the existing preview/apply/replay tests. The eight wake migrations (four night-step, four death-step) keep the same `NightStepSpec` and actor predicates. No role-specific answer or wake logic was dropped.

## Owner decisions

1. 0.6.0 is merged; tag `v0.6.0` and Pages smoke are owner operations.
2. Decide whether the remaining 251 role-level rules and 12 partial rows are acceptable for #200 closure, or require further sentence mapping.
3. Preserve the Pukka self-target source ambiguity (#313/#218/#219); do not invent a ruling.
4. Dreamer/Evil Twin remain the only #211 contract decision; approve or defer their decision-shape extension.

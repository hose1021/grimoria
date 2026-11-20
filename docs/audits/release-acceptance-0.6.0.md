# Release acceptance — 0.6.0

Status: **release candidate after independent rules audits**. The integrated
`dev` tree passed the checks recorded below on the exact commit named in
**Identity**. The owner's merge of the release pull request, the `main`
verification and the production acceptance remain separate steps.

## Identity

| Item | Value |
| --- | --- |
| Version | 0.6.0 |
| Integrated `dev` commit | `ab9592f` (`test(engine): prove Tea Lady execution protection and citation scope (#218) (#406)`) |
| Release pull request | #366 (`dev` → `main`), head follows `dev` |
| Schema | `pg.game.v4`, unchanged |
| Runtime | Node.js 26 LTS |

## Verification on the integrated `dev` commit

| Gate | Result | Evidence |
| --- | --- | --- |
| CI workflow on `dev` | passed | run 44749093094 |
| Type check, lint and format, unit tests, scenarios, Playwright | passed on the same tree | PR #406 CI (head `19d7753`) and the dev dispatch |
| Unit tests | 1,373 passed | `npm test` on `ab9592f` |
| Playwright browser cases | 47 indexed; full suite passed locally | `node scripts/browser-check.ts` on the branch |
| `VERIFICATION_BASE_REF=origin/dev node scripts/verification/gates.ts --scope=all` | passed: 523 official rules, 167 engine rules, 87 UI contracts, **0 recorded findings** | local run on `ab9592f` |
| Mutation probes | **10 of 10 detected by assertion diagnostics** | `npm run verification:mutation` on `ab9592f` |
| OpenSpec main specs | passed: 27 specs | `openspec validate --specs --strict` |
| OpenSpec active changes | passed: 11 changes | `openspec validate --changes --strict` |
| OpenSpec artifact and citation check | passed: 27 specs, 11 active changes | `node scripts/openspec-check.ts` |
| Official provenance | passed: 82 pinned entries | `node scripts/check-official.ts` |
| Acceptance matrix | passed: 72 matrix roles, 52 test files | `node scripts/check-acceptance.ts` |

### Gate execution status

| Gate | Status on this commit | Note |
| --- | --- | --- |
| CI, verification jobs, scenarios, Playwright | executed and passed | PR #406 CI on the same tree; dev dispatch run 44749093094 completed successfully |
| Mutation probes | executed locally and passed | the PR workflow disables this job by condition |
| OpenSpec, provenance, acceptance | executed locally and passed | commands above |
| Checks not executed | none | every result names its command or CI job |
| Failed checks | none | — |

## Independent rules audits

Three read-only Rules Analysts audited every standard role against the pinned
wiki, without using the implementation as the source of expected behavior. The
audit reports are workspace artifacts (`/tmp/audit-tb.md`,
`/tmp/audit-bmr.md`, `/tmp/audit-snv.md`); their summaries are recorded on
issues #217, #218 and #219.

| Script | Roles | Rule rows | Confirmed defects | Remaining evidence gaps |
| --- | ---: | ---: | --- | --- |
| Trouble Brewing | 22 | 28 (25 verified, 3 host-choice) | registration timing, Librarian zero, Scarlet Woman day order | Virgin/Drunk/Soldier citation gaps; Recluse minion option fixed in #381; Slayer/Butler/Imp/Monk covered by #383 |
| Bad Moon Rising | 25 | 49 (45 verified, 4 host-choice) | Moonchild timing, dead-source drunk | Pukka resurrection, Tea Lady clearing vs r3074, Assassin/Zombuul, Zombuul, Grandmother evidence; Mastermind/Professor/Minstrel/Tea Lady covered by #382 |
| Sects & Violets | 25 | 53 (40 verified, 13 host-choice) | Barber multiple Demons, Cerenovus madness source | Vigormortis setup citation and citation drifts; Vortox/Philosopher covered by #385 |

### Defects found and fixed in this release

| Defect | Rule | Fix | Test | PR |
| --- | --- | --- | --- | --- |
| Registration lost at the night step was ignored | TB-WASHERWOMAN/LIBRARIAN/INVESTIGATOR-01 | ask for setup when the registrant is impaired | three Spy/Recluse step-time cases | #372 |
| Impaired Librarian refused the zero | TB-LIBRARIAN-01 | offer zero as false information | paired impaired zero | #372 |
| Dead source kept its drunk | SYS-EFFECTS-03 | `onDeath` marker; ordinary drunks end | Minstrel/Courtier/Innkeeper | #373 |
| Daytime Scarlet Woman reveal after the Imp step | TB-SCARLETWOMAN-02 | day reveal before Imp; night reveal after | queue order and act | #374 |
| Moonchild impairment judged at the choice | BMR-MOONCHILD-01 | night-time state at resolution | two official cases + legacy save | #375 |
| Barber could not choose the second Demon | SNV-BARBER-01 | acting Demon is the one among the targets | second-Demon swap | #376 |
| Cerenovus madness ignored its source | SNV-CERENOVUS-01 | persistent-effect source check; Vigormortis retention | poisoned suspension, dead end | #377 |
| Recluse declared options omitted minion | TB-RECLUSE-02 | declare `minion`; accept it at the step | declared set + Undertaker acceptance | #381 |

The Witch three-living guard test was also strengthened so removing the guard
fails it (#377).

### Post-audit evidence hardening

| PR | Content |
| --- | --- |
| #381 | Recluse r3007 registration options now declare `minion`; the Undertaker test accepts the value while a character id is refused. |
| #382 | BMR tests: impaired Tea Lady/Minstrel, Professor once-per-game branches, Mastermind extra-day branches. No behavior change. |
| #383 | TB tests: Slayer once-per-game/dead Demon, dead Butler vote, Imp dead/poisoned attack, Monk self-kill assertions. No behavior change. |
| #385 | S&V tests: impaired and Vortox-constrained Oracle, Flowergirl, Town Crier, Seamstress and Juggler answers; Philosopher owner-sobering. No behavior change. |
| #386 | Storefront welcome redesign (#384): new shell, fonts, design docs and OpenSpec change `storefront-welcome`; CI and Playwright green on the merged tree. |
| #389 | 12 reviewed atomic mappings from official sentences to engine rows: sentence-level evidence rises from 1 to 13 of 523. |
| #390 | Persistence/replay tests: pending Imp heir across reload, suspended Cerenovus madness, dead-source drunks, legacy Moonchild save. No behavior change. |
| #391 | BMR/S&V model-based full games and cross-role tests; a Vortox mandatory false answer is now journaled as `false-information`, not `registration-ambiguity`. |
| #393 | 11 more reviewed atomic mappings for Slayer, Butler and Vortox sentences; 23 verified + 1 partial. |
| #394 | Four browser cases: storefront at 390 px, pending Imp heir across reload, Vortox false-information label, Cerenovus madness privacy. Full browser suite passes. |
| #398 | Corrected the UI route inventory: `/public` is not a route after the storefront redesign; the fallback is `/table`. Mutation probe count corrected to 9. |
| #399 | 207 independent SAFE atomic mappings from the TB/BMR/S&V analysts; PARTIAL and DO_NOT_MAP cases stay unmapped. |
| #397 | Engine-derived Storyteller reference (#396): new `/reference` and `/reference/{roleId}` screens, generated role facts and tests; OpenSpec `storyteller-reference`. |
| #402 | Closed the shown-role mutation gap: `cardRoleId` is shared by both private cards, with a unit assertion and the 10th mutation probe; #329 and the stale #321 closed with browser evidence. |
| #403 | Zombuul recount: `resetVotes` now returns a registered-dead voter's token using `registersAlive`. |
| #404 | Recorded-outcome guards: an impaired Assassin or Moonchild cannot kill; the Moonchild spares an evil target; the Assassin declares no first-night step. |
| #405 | Vigormortis: executing it, or impairing it mid-night, now releases the neighbour poison at once. |
| #406 | Tea Lady execution, dead-Tea-Lady and non-neighbour tests; matrix correction for execution protection and the execution-only Devil's Advocate. |

Four independent read-only audits covered Zombuul, Tea Lady/Assassin,
Vigormortis and Pukka. They found four wrong-consequence defects, all fixed
above. Pukka self-target remains source-ambiguous and host-adjudicated; no
confirmed defect was found. The Assassin moved to a typed `night-step`
capability, so the ownership ledger is now 36 capability-plus-engine-reference
roles and 30 engine-branch roles.

These changes raise the unit suite to 1,373 and the browser index to 47 cases.
Atomic evidence is **230 verified plus 1 partial** official sentence; **292
remain `ROLE_LEVEL_ONLY`**.

## Role coverage

| Stock script | Roles | Verified roles | Storyteller-choice roles | Unsupported roles | Verified rule rows | Host-choice rule rows |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Trouble Brewing | 22 | 20 | 2 | 0 | 25 | 3 |
| Bad Moon Rising | 25 | 21 | 4 | 0 | 45 | 4 |
| Sects & Violets | 25 | 17 | 8 | 0 | 40 | 13 |
| **Total** | **72** | **58** | **14** | **0** | **110** | **20** |

The 14 Storyteller-choice **roles** and the 20 host-choice **rule rows** are
different counts: a role is classified by any host-choice row it carries, and a
role can carry more than one such row. The counts come from
`docs/rules-matrix.md`; `check-acceptance` and the README table keep the role
counts equal.

## OpenSpec

The 76 completed changes that were still active were archived in #371. Their
deltas reached the baseline, seven stale MODIFIED blocks were refreshed without
dropping a scenario, and 16 over-long requirements were shortened under the
validator's limit. The tree now validates 27 main specs and 11 active changes:
`storefront-welcome` (#384) and `storyteller-reference` (#396). The archive is
committed rather than left as process debt.

## What this report does not prove

- **Sentence-level rules coverage is 230 verified plus 1 partial of 523 official
  sentences.** The other 292 are `ROLE_LEVEL_ONLY`; the mappings were proposed
  by three independent read-only Rules Analysts and only SAFE sentences were
  added. The 292 remain visible in `uncovered.json`.
- **The 58 verified roles are a test/implementation classification, not a
  certification of every printed sentence.** The independent audits above found
  seven behavioral defects, one journal-labelling defect and one latent
  registration incompleteness in rows that were already marked verified, which
  is exactly why the classification is not proof.
- **An empty findings register means no registered finding.** It does not prove
  the absence of unknown defects.
- **Green CI is not a rules argument.** CI proves that the committed tests,
  trace data, architecture and policy checks pass on this tree.
- **The audits leave evidence gaps.** They are listed per script above and on
  issues #217–#219; they are test/citation gaps, not confirmed behavioral
  defects, unless an issue says otherwise.
- **Final acceptance on `main` is not done.** The merge, tag `v0.6.0`, Pages
  smoke test and the final `main` acceptance are owner-controlled (#223).

## Known limits carried into the release candidate

- Bad Moon Rising and Sects & Violets remain beta: their printed abilities need
  more Storyteller adjudication than Trouble Brewing.
- The Pukka self-target consequence is a host-adjudicated default
  (`BMR-PUKKA-06`, `host-choice`), corrected through the correction dialog.
- The 20 host-choice rule rows (14 roles) are legal manual decisions; the engine
  applies the chosen consequence and journals it.
- Issues #211 and #216–#222 keep their independent audit work open. This
  candidate claims no 72/72 sentence-level certification.
- The final acceptance on the exact released `main` commit, the tag and the
  Pages deployment are owner-controlled (#223).

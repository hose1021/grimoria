# Release acceptance — 0.6.0

Status: **release candidate after independent rules audits**. The integrated
`dev` tree passed the checks recorded below on the exact commit named in
**Identity**. The owner's merge of the release pull request, the `main`
verification and the production acceptance remain separate steps.

## Identity

| Item | Value |
| --- | --- |
| Version | 0.6.0 |
| Integrated `dev` commit | `306d79a` (`test(snv): add Vortox and impaired host-answer evidence (#219)`) |
| Release pull request | #366 (`dev` → `main`), head follows `dev` |
| Schema | `pg.game.v4`, unchanged |
| Runtime | Node.js 26 LTS |

## Verification on the integrated `dev` commit

| Gate | Result | Evidence |
| --- | --- | --- |
| CI workflow on `dev` | passed | run 44726119084 |
| Type check, lint and format, unit tests, scenarios, Playwright | passed on the same tree | PR #385 CI (head `d16f5fb`) and the dev dispatch |
| Unit tests | 1,355 passed | `npm test` on `306d79a` |
| `VERIFICATION_BASE_REF=origin/dev node scripts/verification/gates.ts --scope=all` | passed: 523 official rules, 167 engine rules, 87 UI contracts, **0 recorded findings** | local run on `306d79a` |
| Mutation probes | **9 of 9 detected by assertion diagnostics** | `npm run verification:mutation` on `306d79a` |
| OpenSpec main specs | passed: 27 specs | `openspec validate --specs --strict` |
| OpenSpec active changes | passed: 9 changes | `openspec validate --changes --strict` |
| OpenSpec artifact and citation check | passed: 27 specs, 9 active changes | `node scripts/openspec-check.ts` |
| Official provenance | passed: 82 pinned entries | `node scripts/check-official.ts` |
| Acceptance matrix | passed: 72 matrix roles, 51 test files | `node scripts/check-acceptance.ts` |

### Gate execution status

| Gate | Status on this commit | Note |
| --- | --- | --- |
| CI, verification jobs, scenarios, Playwright | executed and passed | PR #385 CI on the same tree; dev dispatch run 44726119084 completed successfully |
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

These tests raise the unit suite to 1,355 and remove the covered items from the
audit's gap list. They do not change the sentence-level count.

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
validator's limit. The tree now validates 27 main specs and 9 active changes;
the archive is committed rather than left as process debt.

## What this report does not prove

- **Sentence-level rules coverage is 1 of 523 official sentences.** Only
  `WIN-001` has reviewed sentence-level evidence. The other 522 are
  `ROLE_LEVEL_ONLY`.
- **The 58 verified roles are a test/implementation classification, not a
  certification of every printed sentence.** The independent audits above found
  seven behavioral defects and one latent registration incompleteness in rows
  that were already marked verified, which is exactly why the classification is
  not proof.
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

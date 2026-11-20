# Release acceptance — 0.6.0

Status: **release candidate**. The integrated `dev` tree passed the checks
recorded below on the exact commit named in **Identity**. The owner's merge of
the release pull request, the `main` verification and the production acceptance
remain separate steps.

## Identity

| Item | Value |
| --- | --- |
| Version | 0.6.0 |
| Integrated `dev` commit | `5f079e1a15a929e4c0785d77a5c5e732ce453306` |
| Release pull request | #366 (`dev` → `main`), head follows `dev` |
| Schema | `pg.game.v4`, unchanged |
| Runtime | Node.js 26 LTS |

## Verification on the integrated `dev` commit

| Gate | Result | Evidence |
| --- | --- | --- |
| Type check | passed | CI run 44713382819, job `Type check` |
| Lint and format | passed | CI run 44713382819, job `Lint and format` |
| Unit tests | passed | CI run 44713382819, job `Unit tests`; test manifest holds 1,410 node tests |
| Full-game scenarios | passed | CI run 44713382819, job `Full-game scenarios` |
| Playwright regression checks | passed | CI run 44713382819, job `Playwright regression checks` |
| Semantic contracts and traceability | passed | Verification run 44713382969, job `Semantic contracts and traceability` |
| Known findings register | passed: **0 recorded findings** | Verification run 44713382969, job `Known findings register` |
| `VERIFICATION_BASE_REF=origin/dev node scripts/verification/gates.ts --scope=all` | passed: 523 official rules, 167 engine rules, 87 UI contracts, 0 findings | local run on `5f079e1` |
| Mutation probes | passed: **9 of 9 detected by assertion diagnostics** | `npm run verification:mutation` on `5f079e1` |
| OpenSpec main specs | passed | `openspec validate --specs --strict`: 25 passed, 0 failed |
| OpenSpec active changes | passed | `openspec validate --changes --strict`: 85 passed, 0 failed |
| OpenSpec artifact and citation check | passed | `node scripts/openspec-check.ts`: 25 specs, 85 active changes |
| Official provenance | passed | `node scripts/check-official.ts`: 82 pinned entries |
| Acceptance matrix | passed | `node scripts/check-acceptance.ts`: 72 matrix roles, 51 test files |
| Role reference digest | current | `node scripts/build-official-roles.ts --check`: 72 roles, 3 scenarios |

### Gate execution status

| Gate | Status on this commit | Note |
| --- | --- | --- |
| CI and verification PR jobs | executed, passed | see the table above |
| Mutation probes | executed locally, passed | the PR workflow disables this job by condition; the local run is the evidence |
| Checks not executed | none | every result above names the command or CI job that produced it |
| Failed checks | none | — |

## Role coverage

| Stock script | Roles | Verified roles | Storyteller-choice roles | Unsupported roles | Verified rule rows | Host-choice rule rows |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Trouble Brewing | 22 | 20 | 2 | 0 | 25 | 3 |
| Bad Moon Rising | 25 | 21 | 4 | 0 | 45 | 4 |
| Sects & Violets | 25 | 17 | 8 | 0 | 40 | 13 |
| **Total** | **72** | **58** | **14** | **0** | **110** | **20** |

The 14 Storyteller-choice **roles** and the 20 host-choice **rule rows** are
different counts: a role is classified by any host-choice row it carries, and a
role can carry more than one such row. The row counts come from
`docs/rules-matrix.md`; `check-acceptance` and the README table keep the role
counts equal. A Storyteller-choice row is a legal manual decision with a state
consequence the engine applies and journals, not an automation gap.

## What this report does not prove

- **Sentence-level rules coverage is 1 of 523 official sentences.** The
  verification register maps one official rule (`WIN-001` → `SYS-WINS-02`) to
  reviewed sentence-level evidence. The other 522 official rules are
  `ROLE_LEVEL_ONLY`: another rule for the same character passing does not prove
  that sentence.
- **The 58 verified roles are a test/implementation classification, not an
  independent certification of every printed sentence.** The role audit issues
  #217–#219 remain the place where that certification is tracked.
- **An empty findings register means no registered finding.** It does not prove
  the absence of unknown defects.
- **Green CI is not a rules argument.** CI proves that the committed tests,
  trace data, architecture and policy checks pass on this tree.
- **Trouble Brewing, Bad Moon Rising and Sects & Violets are not equally
  settled.** Bad Moon Rising and Sects & Violets remain beta because their
  printed abilities need more Storyteller adjudication than Trouble Brewing.
- **Final acceptance on `main` is not done.** The merge, tag `v0.6.0`, Pages
  smoke test and the final `main` acceptance are owner-controlled (#223).

## Evidence per fixed issue

| Issue | Evidence |
| --- | --- |
| #313 | `engine.test.ts`, `bmr.test.ts`; browser `seat-lock` |
| #314 | `snv.test.ts` mid-game start-knowing cases |
| #315 | `engine.test.ts` Drunk Slayer |
| #316 | `bmr.test.ts`, `snv.test.ts` duplicate-seat cases |
| #317 | `table.test.ts` survival projection; browser `pacifist-survival` |
| #318 | `engine.test.ts`, `bmr.test.ts`; browser `mandatory-skip` |
| #319 | browser `klutz-day` |
| #320 | `snv.test.ts`, `helpers.test.ts` borrowed abilities |
| #321 | issue commit `491ecac`; `helpers.test.ts` given-answer precedence |
| #322 | `helpers.test.ts` draft key; browser `day-reset` |
| #324 | `secrets-contract.test.ts`; browser `secrets-checks` |
| #325 | browser `corrections` |
| #326 | `role-catalog.test.ts` |
| #327 | `openspec/specs/game/day-and-win/spec.md`; F-013 |
| #328 | `lifecycle.test.ts`; browser `seat-lock` |
| #330 | browser `notes-debounce`, `notes-4000` |
| #331 | `table.test.ts`, `read-models.test.ts` |
| #332 | `gates.ts --scope=all`; `scripts/verification/*` self-tests |

## Known limits carried into the release candidate

These are documented limits, not open verification findings:

- The Pukka self-target consequence is a host-adjudicated default
  (`BMR-PUKKA-06`, `host-choice`), corrected through the correction dialog.
- The 20 host-choice rule rows (14 roles) are legal manual decisions; the engine
  applies the chosen consequence and journals it.
- Issues #211, #216–#222 keep their independent audit work open
  (capability migration, adjudication inventory, per-script sign-off,
  model-based interactions, provenance matrix, persistence audit). This release
  candidate claims no 72/72 rule-completeness certification.
- The final acceptance on the exact released `main` commit, the tag and the
  Pages deployment are owner-controlled (#223).

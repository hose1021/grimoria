# Release acceptance — 0.6.0

Status: **release candidate**. The integrated `dev` tree passed every check
below. The owner's merge of the release pull request, the `main` verification and
the production acceptance remain separate steps.

## Identity

| Item | Value |
| --- | --- |
| Version | 0.6.0 |
| Integrated `dev` commit | `dd725a20397a182a4d50f538615f8368bf48b16d` |
| Verification PR head | `9ecdacb836a82d08781763a3835ab1db0b2ac412` (PR #364, all jobs green) |
| Schema | `pg.game.v4`, unchanged |
| Runtime | Node.js 26 LTS |

## Verification on the integrated `dev` commit

| Check | Result |
| --- | --- |
| `npm ci` then `npm run verify` | passed (typecheck, lint, format, tests, build, fallback, offline, source policy, official provenance 82 entries, acceptance 72 roles, version, role ownership) |
| `VERIFICATION_BASE_REF=origin/dev node scripts/verification/gates.ts --scope=all` | passed: 523 official rules, 167 engine rules, 87 UI contracts, **0 known findings** |
| `npm test` | 1,322 node tests passed |
| `node scripts/run-scenarios.ts` (test build) | 10 of 10 full-game scenarios passed |
| `node scripts/browser-check.ts` (Playwright, 390 px and desktop) | 25 of 25 cases passed |
| `node scripts/check-official.ts` | 82 pinned entries verified |
| `node scripts/check-acceptance.ts` | 72 matrix roles, 51 test files |

The verification register (`docs/audits/verification-gates/`) now lists no
uncovered UI contract, no `implemented-unverified` engine rule and no legal
command without a UI caller. The findings gate is green on the exact integrated
commit.

## Role coverage

| Stock script | Roles | Verified | Storyteller choice | Unsupported |
| --- | ---: | ---: | ---: | ---: |
| Trouble Brewing | 22 | 20 | 2 | 0 |
| Bad Moon Rising | 25 | 21 | 4 | 0 |
| Sects & Violets | 25 | 17 | 8 | 0 |

A Storyteller-choice row is a legitimate manual decision with a state
consequence the engine applies, not an automation gap. The counts come from
`docs/rules-matrix.md` and the README table; `check-acceptance` keeps them equal.

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
| #321 | `helpers.test.ts` impaired card |
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

- Bad Moon Rising and Sects & Violets remain beta: their printed abilities need
  more Storyteller adjudication than Trouble Brewing.
- The Pukka self-target consequence is a host-adjudicated default
  (`BMR-PUKKA-06`, `host-choice`), corrected through the correction dialog.
- The 20 Storyteller-choice rows are legal manual decisions; the engine applies
  the chosen consequence and journals it.
- Issues #211, #216–#222 keep their independent audit work open (capability
  migration, adjudication inventory, per-script sign-off, model-based
  interactions, provenance matrix, persistence audit). The release candidate
  claims no 72/72 rule-completeness certification.
- The final acceptance on the exact released `main` commit, the tag and the
  Pages deployment are owner-controlled (#223).

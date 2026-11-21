# Bad Moon Rising production acceptance

Status: **PASS** — independently certified on `chore/bmr-snv-certification`
`e93d4c80267380198bdd1bc1268b44bff0a8dfff`. The BETA marker is removed in the
stacked `chore/remove-bmr-snv-beta-final` branch, which is not merged.

## Identity

| Item | Value |
| --- | --- |
| Product version | 0.7.0 |
| Released `main` | `aa1e11b912bbd755a2b653dcb8966e54512b893b` (0.7.0) |
| Integration base | `6ad2c52bf866103cdce73ffa75c970067e17f805` (`origin/dev`, mobile bag order #468) |
| Certified head | `e93d4c80267380198bdd1bc1268b44bff0a8dfff` |
| Fix commit under review | `d8793fc45709eceaf0e60ea8e43a60a2a91906ff` |
| Schema | `pg.game.v4`, unchanged |
| Runtime | Node.js 26 LTS |

The audit ran on `76fd2afbc109ad9e8b474eb12dbca52c3bdd9ebf`; the two commits
after that tree are a type-helper correction and test formatting. The only
behavioral delta from `origin/dev` is the certification fix commit and the
generated verification artifacts.

## Authority and method

The pinned wikitext in `docs/official/wiki/<Title>.r<oldid>.wikitext` is the only
normative source. `docs/rules-matrix.md` and `src/core/roles/<id>/rule.md` are
indexes; a green test or `verified` row is not proof without reading the
assertion. Three independent read-only audits ran in separate worktrees:

- BMR rules: `grimoria-audit-bmr`, report `docs/audits/bmr-independent-audit.md`.
- S&V rules: `grimoria-audit-snv`, report `docs/audits/snv-independent-audit.md`.
- Production UI: `grimoria-audit-ui`, report `docs/audits/production-ui-independent-audit.md`.
- Compliance: `grimoria-audit-compliance`, report `docs/audits/compliance-signoff.md`.

Every role below was checked sentence by sentence against the pinned Summary,
How to Run and the relevant Glossary/States/Rules Explanation page. A rule is
`verified` only when its asserting test body was opened and matched the source;
legal Storyteller judgment stays `host-choice` and is not counted as automation.

## Character accounting

| Role | Pinned oldid | Rules | Verified | Host choice | Defect fixed | Evidence gap closed |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| grandmother | r2978 | 2 | 2 | 0 | 0 | 0 |
| sailor | r1768 | 2 | 2 | 0 | 0 | 0 |
| chambermaid | r2966 | 5 | 4 | 1 | 0 | 0 |
| exorcist | r2973 | 2 | 2 | 0 | 0 | 0 |
| innkeeper | r3160 | 1 | 1 | 0 | 0 | 0 |
| gambler | r3073 | 2 | 2 | 0 | 0 | 0 |
| gossip | r1773 | 1 | 1 | 0 | 0 | 0 |
| courtier | r2968 | 1 | 1 | 0 | 0 | 0 |
| professor | r1775 | 3 | 3 | 0 | 0 | 0 |
| minstrel | r2600 | 1 | 1 | 0 | 0 | 0 |
| tealady | r1777 | 1 | 1 | 0 | 0 | 0 |
| pacifist | r2601 | 1 | 0 | 1 | 0 | 0 |
| fool | r2636 | 1 | 1 | 0 | 0 | 0 |
| tinker | r1782 | 1 | 0 | 1 | 0 | 0 |
| goon | r2977 | 1 | 1 | 0 | 0 | 0 |
| lunatic | r3112 | 1 | 0→1 | 0 | 1 | 0 |
| moonchild | r1783 | 3 | 3 | 0 | 0 | 0 |
| godfather | r2394 | 3 | 3 | 0 | 0 | 0 |
| devilsadvocate | r2594 | 3 | 3 | 0 | 0 | 0 |
| assassin | r1786 | 2 | 2 | 0 | 0 | 0 |
| mastermind | r2993 | 1 | 0→1 | 0 | 1 | 0 |
| pukka | r3074 | 7 | 6 | 1 | 0 | 0 |
| shabaloth | r1790 | 1 | 0→1 | 0 | 0 | 1 |
| po | r3104 | 1 | 0→1 | 0 | 0 | 1 |
| zombuul | r3022 | 2 | 2 | 0 | 0 | 0 |
| **Total** | | **49** | **45** | **4** | **2** | **2** |

The four host-choice rows are `BMR-CHAMBERMAID-04`, `BMR-PACIFIST-01`,
`BMR-TINKER-01` and `BMR-PUKKA-06`. They are legal Storyteller decisions, not
missing mechanics.

## Confirmed defects and resolutions

| Defect | Source | Observed | Fix | Regression |
| --- | --- | --- | --- | --- |
| `BMR-MASTERMIND-01` | Mastermind r2993: “If an evil player is executed or nobody is executed, then the good team wins.” | The no-execution extra day won for good but named `demon-dead`, whose detail claims a Demon inheritance that BMR does not have. | `src/core/engine/day.ts` now sets `mastermind-no-execution`; the reason has its own detail and RU/EN/AZ string. | `bmr.test.ts` “the Mastermind extra day ends good when nobody is executed”; “the Mastermind plays the extra day with only two players alive”. |
| `BMR-LUNATIC-01` | Lunatic r3112: “The Lunatic wakes during the first night to learn three bluffs and the appropriate number of Minions.” | At 5–6 players no demon bluffs are dealt, so the note ended “3 добрые роли …: —.” | `lunaticBluffIds` falls back to three deterministic good characters (in-play allowed) when no stored list exists; legacy journals keep their recorded empty result. | `bmr.test.ts` “a six-player Lunatic is shown three good roles without dealt bluffs”. |

Both defects were reproduced RED before the fix and observed GREEN after it.
The evidence gaps for the Shabaloth’s two simultaneous kills and the Po’s
three-target night are closed by assertions in the existing tests; the
implementations were already correct (probe-confirmed).

## Verification evidence on the certified head

| Check | Result |
| --- | --- |
| `npm test` | 1541 pass, 0 fail |
| `node --test src/core/engine/bmr.test.ts src/core/engine/snv.test.ts src/core/engine/snv-certification.test.ts` | 446 pass, 0 fail |
| BMR rules audit commands | 204 BMR tests, 42 role tests, 32 focused cross-role tests, 8 persistence/setup tests: all pass |
| `node scripts/run-scenarios.ts` (test build, BASE_PATH=/pocket/) | 10/10 full-game scenarios pass, including `bmr-15-targets` and `bmr-15-sailor-zombuul` |
| `node scripts/browser-check.ts` (test-mode artifact, real `/table`) | 37/37 named cases plus all phases pass; mobile 360×640 and 640×360 acceptance reached |
| `VERIFICATION_BASE_REF=origin/dev node scripts/verification/gates.ts --scope=all` | 523 official rules / 172 engine rules / 87 UI contracts, 0 findings |
| `npm run verification:mutation` | 10/10 critical mutations detected |
| `node scripts/openspec-check.ts` | 27 specs, 26 active changes |
| `openspec validate --changes --strict` / `--specs --strict` | 26/26 and 27/27 |
| `node scripts/check-official.ts` | 82 pinned entries |
| `node scripts/check-acceptance.ts` | 72 matrix roles, 57 test files |
| `npm run verify` | typecheck, lint, format, tests, build, fallback, offline, source policy, provenance, acceptance, version, ownership pass |

Browser evidence was taken through the real `/table` route at 390 px, not from
unit projections. The focused production cases cover Mayor redirect, Pacifist
survival, Tinker day/night death, the Demon heir question and reload, the Pukka
Goon interaction, the Mastermind extra day, Evil Twin pairing, and the added
undo/redo dock control. `adjudication-persistence` applies a choice, clicks the
dock Undo, observes the restored state and an enabled Redo, clicks Redo, and
then reloads and replays the journal.

## UI reachability and privacy

Every BMR mechanical consequence has a production `/table` path:

| Choice | Route and control | Persistence proof |
| --- | --- | --- |
| Mayor redirect | `select[data-redirect]` on the Imp step | apply, journal replay, undo/redo, reload, replay |
| Demon heir | heir dialog with living Minions | apply, reload, journal replay |
| Pacifist survival | `[data-exec-survives]` in the day dock | apply, undo/redo, reload, replay |
| Tinker death | `[data-tinker-decision]` on the Tinker step | apply, undo/redo, reload, replay |
| Registration | registration controls on the information step | apply, replay, privacy |
| Undo / redo | `[data-act="undo"]`, `[data-act="redo"]` | dock undo/redo then journal replay |

Nominations and individual vote recording remain an in-person table action; the
app records the vote count and execution result through `setVoteCount` and
`executeByDecision`, as `SPEC.md` and `docs/audits/verification-gates/command-scope.json`
state. No hidden role, note, Tinker decision or host answer reaches
`publicGameView` or the player handoff. RU/EN/AZ parity and rendered day
surfaces pass; offline reload and the update prompt pass; `pg.game.v4`
import/export and legacy journals replay.

## Exceptions and residual risks

- **Pukka self-target (`BMR-PUKKA-06`)** is the matrix-disclosed extrapolation.
  The engine records a host-adjudicated default; the correction dialog records a
  different reading. It is not claimed as a source-confirmed ruling.
- **Setup composition table** is not in the pinned wiki snapshots. The engine
  table matches the published BMR sheet and the setup tests; `Setup.r1361`
  confirms 5–6 players are legal but not recommended.
- **Night order** comes from the committed official `nightsheet.json`; the wiki
  page carries it as an image.
- **Godfather impaired first-night false list** is host narration; the app
  previews the true list and records the table statement.
- **Jinxes, Travellers, Fabled, Loric and mixed-edition automatic play** are
  outside the supported BMR scope and remain explicit manual boundaries.
- **The UI deliberately keeps individual nominations and voter lists off the
  screen**; it records the vote count and execution. This is a product decision,
  not an unmodelled BMR mechanic.
- **With exactly one living Minion the Imp’s successor is deterministic**, so
  the table records the succession without a dialog; with two or more living
  Minions it asks the host and offers only legal heirs. No legal choice is lost.
- **Undo history resets on a full reload**; the saved game and journal survive
  and replay exactly, and redo is a visible dock control during the session.

## Independent acceptance

The BMR rules audit found two low-severity defects, both fixed and re-tested.
The production UI audit found one actionable gap — redo had no control — now
fixed and proven through the dock. The independent compliance audit reproduced
the RED/GREEN evidence with its own probes (`6ad2c52`: 7 pass / 6 fail;
`d8793fc` and the final tree: 13/13 pass), verified the pinned sentences, and
re-ran the full suite, gates, 10/10 scenarios and 37/37 browser cases on the
exact tree. Its only qualifications were documentary: the repo browser suite
uses a `--mode test` artifact with the harness entry (the separate production
`dist` was built and version-checked), and the “zero gaps” statement means zero
mechanical gaps while the disclosed host-duty residuals remain. See
`docs/audits/compliance-signoff.md`.

**Independent verdict: PASS** (Bad Moon Rising).

## Verdict

**BMR: PASS.** All 25 characters are accounted for against pinned text; no
confirmed unimplemented mechanical requirement remains in supported scope; the
two confirmed defects are fixed with regressions; every consequential choice is
reachable, legal and journaled; privacy, replay, undo/redo, reload, offline and
RU/EN/AZ pass; all mandatory checks pass on `e93d4c80`.

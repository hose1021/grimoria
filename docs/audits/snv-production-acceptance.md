# Sects & Violets production acceptance

Status: **PASS** — independently certified on `chore/bmr-snv-certification`
`e93d4c80267380198bdd1bc1268b44bff0a8dfff`. The BETA marker is removed in the
stacked `chore/remove-bmr-snv-beta-final` branch, which is not merged.

## Identity

| Item | Value |
| --- | --- |
| Product version | 0.7.0 |
| Released `main` | `aa1e11b912bbd755a2b653dcb8966e54512b893b` (0.7.0) |
| Integration base | `6ad2c52bf866103cdce73ffa75c970067e17f805` (`origin/dev`) |
| Certified head | `e93d4c80267380198bdd1bc1268b44bff0a8dfff` |
| Fix commit under review | `d8793fc45709eceaf0e60ea8e43a60a2a91906ff` |
| Schema | `pg.game.v4`, unchanged |
| Runtime | Node.js 26 LTS |

## Authority and method

The pinned wikitext is the only normative source. The independent S&V audit
read every role’s pinned Summary and How to Run, then the implementation, then
the body of each cited assertion. It treated legal Storyteller judgment as
`host-choice`, not as automation, and did not accept a `verified` matrix row or
a green suite as proof.

Priority areas: madness (Cerenovus, Mutant, Evil Twin), Vortox information and
the no-execution win, Pit-Hag transformations and arbitrary deaths, the
Philosopher’s borrowed ability and drunk state, Fang Gu succession, Snake
Charmer swaps, Vigormortis retention and poison, No Dashii neighbours,
Sweetheart/Sage/Barber death-time character, and the information/privacy roles.

## Character accounting

| Role | Pinned oldid | Rules | Verified | Host choice | Defect fixed | Evidence gap closed |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| artist | r3156 | 1 | 0 | 1 | 0 | 0 |
| barber | r1757 | 4 | 2→4 | 0 | 1 | 1 |
| cerenovus | r3048 | 1 | 0 | 1 | 0 | 0 |
| clockmaker | r2967 | 3 | 2 | 1 | 0 | 0 |
| dreamer | r2904 | 1 | 0 | 1 | 0 | 0 |
| eviltwin | r3101 | 5 | 2→3 | 2 | 1 | 0 |
| fanggu | r2974 | 4 | 4 | 0 | 0 | 0 |
| flowergirl | r2907 | 2 | 2 | 0 | 0 | 0 |
| juggler | r2401 | 2 | 2 | 0 | 0 | 0 |
| klutz | r1758 | 2 | 2 | 0 | 0 | 0 |
| mathematician | r3153 | 4 | 2 | 2 | 0 | 0 |
| mutant | r1755 | 1 | 0 | 1 | 0 | 0 |
| nodashii | r3158 | 2 | 1→2 | 0 | 1 | 0 |
| oracle | r2909 | 1 | 1 | 0 | 0 | 0 |
| philosopher | r2421 | 2 | 2 | 0 | 0 | 0 |
| pithag | r2998 | 1 | 1 | 0 | 0 | 0 |
| sage | r3009 | 1 | 1 | 0 | 0 | 0 |
| savant | r2910 | 4 | 2 | 2 | 0 | 0 |
| seamstress | r1999 | 1 | 1 | 0 | 0 | 0 |
| snakecharmer | r2905 | 1 | 1 | 0 | 0 | 0 |
| sweetheart | r2704 | 2 | 2 | 0 | 0 | 0 |
| towncrier | r3145 | 1 | 1 | 0 | 0 | 0 |
| vigormortis | r3015 | 4 | 4 | 0 | 0 | 0 |
| vortox | r3017 | 2 | 1 | 1 | 0 | 0 |
| witch | r2682 | 1 | 1 | 0 | 0 | 0 |
| **Total** | | **53** | **41** | **12** | **3** | **1** |

The twelve host-choice rows are `SNV-ARTIST-01`, `SNV-CERENOVUS-01`,
`SNV-CLOCKMAKER-02`, `SNV-DREAMER-01`, `SNV-EVILTWIN-03`, `SNV-EVILTWIN-05`,
`SNV-MATHEMATICIAN-02`, `SNV-MATHEMATICIAN-03`, `SNV-MUTANT-01`,
`SNV-SAVANT-01`, `SNV-SAVANT-02` and `SNV-VORTOX-02`.

## Confirmed defects and resolutions

| Defect | Source | Observed | Fix | Regression |
| --- | --- | --- | --- | --- |
| Evil Twin suppressed the two-alive evil win (`SNV-EVILTWIN-02`) | Evil Twin r3101 “Good can’t win if you both live”; Rules Explanation r1310 “If just two players are left alive, evil wins”; Glossary r3168 | With both twins alive, no Demon and exactly two living players, `checkWin` returned `null` before the two-alive check. | `src/core/engine/death.ts` keeps the good-win block but awards `two-alive` evil when only two live. | `snv-certification.test.ts` “two living Evil Twins with no Demon win for evil when only two players live”; existing twin block tests still pass. |
| Barber offered a swap without a living Demon (`SNV-BARBER-01`) | Barber r1757 “the Demon may choose 2 players”; Glossary r3168 “Characters have no ability when dead.” | A dead Barber with no living Demon (the Evil Twin continuation) still opened a swap step; a queued step could swap after the last Demon died. | `src/core/engine/sv.ts` appends no Barber step without a living Demon and makes a stale queued swap a no-op. | `snv-certification.test.ts` “a dead Barber opens no swap step while no Demon is alive”; “a Barber swap already queued does nothing if the last Demon died”; borrowed-Barber end-to-end assertion. |
| No Dashii duplicated an effect id (`SNV-NODASHII-01`) | No Dashii r3158: a poisoned Townsfolk who changes character becomes healthy; the new neighbours are poisoned immediately. | A seat that left and re-entered Townsfolk produced a second effect with the same id; `validateState` did not reject the duplicate. | `src/core/engine/sv.ts` revives the existing source/target record instead of adding a duplicate. | `snv-certification.test.ts` “a No Dashii neighbour that leaves and re-enters Townsfolk keeps one effect record”. |

All three were reproduced RED before the fix and observed GREEN after it. The
Barber-borrowed evidence gap (`SNV-BARBER-04`) is closed by asserting that the
Philosopher’s borrowed Barber actually swaps two characters, not merely that a
step appears.

## Verification evidence on the certified head

| Check | Result |
| --- | --- |
| `npm test` | 1541 pass, 0 fail |
| `node --test src/core/engine/bmr.test.ts src/core/engine/snv.test.ts src/core/engine/snv-certification.test.ts` | 446 pass, 0 fail |
| S&V rules audit commands | 237 S&V tests, 164 role tests, cross-role oracle: all pass |
| `node scripts/run-scenarios.ts` (test build, BASE_PATH=/pocket/) | 10/10 full-game scenarios pass, including `sv-12-evil-twin`, `sv-15-roles` and `sv-15-vortox` |
| `node scripts/browser-check.ts` (test-mode artifact, real `/table`) | 37/37 named cases plus all phases pass; 360×640 and 640×360 acceptance reached |
| Independent production UI script (prior audit claim) | 15/15 cases passed on the production `dist` at 390 px; the compliance auditor did not re-run this separate script and instead re-ran the repo suite plus seven named focused cases |
| `VERIFICATION_BASE_REF=origin/dev node scripts/verification/gates.ts --scope=all` | 523 official rules / 172 engine rules / 87 UI contracts, 0 findings |
| `npm run verification:mutation` | 10/10 critical mutations detected |
| `node scripts/openspec-check.ts` | 27 specs, 26 active changes |
| `openspec validate --changes --strict` / `--specs --strict` | 26/26 and 27/27 |
| `node scripts/check-official.ts` | 82 pinned entries |
| `node scripts/check-acceptance.ts` | 72 matrix roles, 57 test files |
| `npm run verify` | typecheck, lint, format, tests, build, fallback, offline, source policy, provenance, acceptance, version, ownership pass |

## UI reachability and privacy

The independent production audit confirmed that every consequential S&V action
has a real `/table` path and survives journal replay, undo/redo and reload:

| Choice | Production control | Proof |
| --- | --- | --- |
| Cerenovus / Mutant madness | `[data-madness-action]`, `[data-madness-reason]` | apply, undo/redo, reload, replay |
| Evil Twin pairing | twin correction dialog, `[data-correct="twin-value"]` | apply, reload, journal replay |
| Pit-Hag change / arbitrary deaths | target + `[data-bmr-role]`, then `[data-bmr-decision="marking"]` | apply, replay, undo/redo |
| Dreamer / Sage pairs | `journal-pairs`, `dreamer-pair` | inspect after reload, private |
| Artist / Savant | private day cards with free-form statements | apply, reload, privacy |
| Juggler | day guess panel | apply, answer on the next night |
| Undo / redo | `[data-act="undo"]`, `[data-act="redo"]` | dock undo/redo then journal replay |

No hidden role, host note, madness source, Evil Twin partner or Dreamer/Sage
pair reaches the public or player projection. RU/EN/AZ parity, 390 px layout,
offline reload and `pg.game.v4` import/export pass.

## Exceptions and residual risks

- **Vortox and the Artist** (`SNV-ARTIST-01`, `SNV-VORTOX-02`): the question is
  free-form, so the engine cannot compute whether “yes”, “no” or “unknown” is
  false. It records the private answer and never interprets it; the truthful
  false answer remains the Storyteller’s official duty. The Savant’s analogous
  truth declaration **is** mechanically constrained.
- **Second Juggler holder with zero guesses**: the explicit command records the
  zero; the automatic end-of-day convenience path only covers the first holder.
  No legal action is missing.
- **Witch at exactly three living**: the curse is suppressed, not deleted. No
  supported S&V role resurrects, so a return to four living is not reachable in
  a legal S&V deal.
- **Spy/Recluse registration in an S&V deal**: mixed editions are rejected
  outside manual mode; Seamstress and Oracle therefore use the real alignment.
- **Clockmaker with two Demons**: the pinned text names “the Demon” and does not
  define the distance with two; the engine uses the first Demon seat. This is an
  open adjudication, not a proven defect.
- **Pit-Hag “kill or protect”**: the host marks the death subset; choosing not
  to mark a death is the protection. There is no separate protection record.
- **Undo history after a full reload**: the game state and journal survive, and
  replay is exact, but browser undo history starts fresh. Redo is now a visible
  dock control and is proven through the production UI.
- **Nominations and individual voter lists** are an in-person table action; the
  app records the vote count and execution result. This is a product decision.

## Independent acceptance

The S&V rules audit found three defects, all fixed and re-tested. The
production UI audit found the redo control missing and the nomination/vote
screen contradictory with `SPEC.md`; redo is now implemented and the spec is
corrected. The independent compliance audit reproduced the RED/GREEN evidence
with its own probes (`6ad2c52`: 7 pass / 6 fail; `d8793fc` and the final tree:
13/13 pass), checked the pinned sentences, and re-ran the full suite, gates,
10/10 scenarios, 37/37 browser cases and seven named focused cases on the
exact tree. Its qualifications were documentary: the repo browser suite uses a
`--mode test` artifact, the separate 15/15 production-UI script was accepted as
a prior audit claim rather than re-run, and “zero gaps” means zero mechanical
gaps while the disclosed host-duty residuals remain. See
`docs/audits/compliance-signoff.md`.

**Independent verdict: PASS** (Sects & Violets).

## Verdict

**S&V: PASS.** All 25 characters are accounted for against pinned text; no
confirmed unimplemented mechanical requirement remains in supported scope; the
three confirmed defects are fixed with regressions; every consequential choice
is reachable, legal and journaled; privacy, replay, undo/redo, reload, offline
and RU/EN/AZ pass; all mandatory checks pass on `e93d4c80`.

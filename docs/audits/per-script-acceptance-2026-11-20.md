# Per-script independent acceptance — 2026-11-20

Issue: #217, #218, #219. Parent: #200. Tree: `dev` `b2896ff`, rechecked after
the harness fix `#423`. These checks confirm the test/implementation
classification, not printed-sentence correctness. Main-script acceptance and
the final release decision remain #223/owner-controlled.

## Shared gate evidence

| Command | Result |
| --- | --- |
| `npm test` | 1386 pass, 0 fail |
| `node scripts/check-acceptance.ts` | passed: 72 matrix roles, 52 test files |
| `VERIFICATION_BASE_REF=origin/dev node scripts/verification/gates.ts --scope=verified` | passed: 523 official rules, 167 engine rules, 87 UI contracts, 0 findings |
| `VERIFICATION_BASE_REF=origin/dev node scripts/verification/gates.ts --scope=findings` | passed |
| `openspec validate --changes --strict` | 12/12 |
| `node scripts/openspec-check.ts` | 27 specs, 12 active changes |

Atomic evidence remains explicitly incomplete: 230 verified plus 1 partial of
523 official sentences at the time of this acceptance run; the later #425
mapping review raises that count but does not close #221.

## Trouble Brewing (#217)

- 22 roles. Matrix: 20 verified, 2 Storyteller-choice (Chef, Empath), 0
  unsupported.
- Rule rows: 28 (25 verified, 3 host-choice: TB-CHEF-02, TB-EMPATH-02,
  TB-EMPATH-03).
- Fresh: `node --test src/core/engine/tb-audit.test.ts` → 65 pass;
  scenarios `tb` → 2/2 pass.
- Confirmed defects fixed on `dev`: registration at the night step and the
  impaired Librarian zero (#372); Scarlet Woman day reveal (#374); Recluse
  `minion` option (#381); Slayer×Recluse / Spy×Virgin registration and Mayor
  consequence journaling (#417). Evidence-only Slayer/Butler/Imp/Monk cases
  (#383).
- Remaining evidence gaps: Virgin host-decision, Drunk mask privacy only,
  Soldier sober safety only, Slayer once-per-game/dead target, dead-Butler free
  vote, Imp dead-target/poisoned-attacker table, Monk self-kill, Librarian
  zero-with-Recluse drift, generic registration map for Spy/Recluse teams,
  citation drift. These are test/citation gaps, not confirmed defects.

## Bad Moon Rising (#218)

- 25 roles. Matrix: 21 verified, 4 Storyteller-choice (Chambermaid, Pacifist,
  Pukka, Tinker), 0 unsupported.
- Rule rows: 49 (45 verified, 4 host-choice: BMR-CHAMBERMAID-04,
  BMR-PACIFIST-01, BMR-PUKKA-06, BMR-TINKER-01).
- Fresh: `node --test src/core/engine/bmr.test.ts` → 175 pass; scenarios `bmr`
  → 2/2 pass.
- Confirmed defects fixed on `dev`: dead-source drunk (#373); Moonchild
  impairment timing (#375); registered-dead Zombuul recount (#403); impaired
  Assassin/Moonchild outcome (#404); Tea Lady execution evidence (#406);
  registered-dead Zombuul wake/kill (#409); blocked Shabaloth regurgitation
  (#412); Innkeeper/Zombuul order (#413); Tinker first-night step (#421).
- Remaining evidence gaps: Pukka pending death/poison after resurrection; Tea
  Lady clearing source; Assassin/Zombuul exception; Tea Lady impairment UI;
  Minstrel impairment; Professor once-per-game; Mastermind branches; Zombuul
  impaired good win; Grandmother impaired information; citation drift. Pukka
  self-target stays a documented source ambiguity (#313/#218/#219), not a
  confirmed defect.

## Sects & Violets (#219)

- 25 roles. Matrix: 17 verified, 8 Storyteller-choice (Artist, Cerenovus,
  Dreamer, Evil Twin, Mathematician, Mutant, Savant, Vortox), 0 unsupported.
- Rule rows: 53 (40 verified, 13 host-choice).
- Fresh: `node --test src/core/engine/snv.test.ts` → 205 pass; scenarios `sv`
  → 3/3 pass.
- Confirmed defects fixed on `dev`: Pit-Hag arbitrary-death guard (#299);
  Barber second Demon (#376); Cerenovus source (#377); Vigormortis poison
  release (#405); Fang Gu protected Outsider (#410); Evil Twin night madness
  win (#411); Sweetheart/Sage death-time character (#414); Clockmaker dead
  Demon origin (#415); Juggler per-holder ledger (#419); unreachable Pit-Hag,
  Tinker and journal controls (#421).
- Remaining evidence gaps: Vigormortis setup row citation; Vortox/impaired host
  answers not covered for every information role; Philosopher later-appearance
  and owner-sobering; citation drift. The Witch three-living guard is covered
  (`snv.test.ts` asserts no curse at exactly three living).

## Limits

- The findings gate proves no registered finding, not absence of unknown
  defects.
- No 72/72 sentence-level claim. #211, #216–#222 and #223 remain open.
- The scenario runner needed a test-mode build and a 404 fallback; the missing
  fallback half-response was fixed in #423.
- Final acceptance on the integrated `main` commit, tag and Pages smoke test
  remain owner-controlled.

# Independent Trouble Brewing audit — 2026-11-18

Scope: the 22 Trouble Brewing roles and the interactions the pinned text
defines. This is a review artifact, not a rules authority: `docs/rules-matrix.md`
keeps the pin and status of every row. The audit was performed on
`origin/dev` at `d8a5017` (`0.4.0`), with the new independent suite
`src/core/engine/tb-audit.test.ts`.

## Method

- Sources: the fetched pinned snapshots in `docs/official/wiki/` (provenance
  verified by `node scripts/check-official.ts`), `docs/rules-matrix.md`, and the
  role dossiers in `src/core/roles/<role>/rule.md`. Every role page was read
  before its behavior was compared.
- Independence: the expected outcome comes from the pinned text and official
  examples, not from the current implementation. A test is accepted as evidence
  only when it asserts a state consequence: a death, role, winner, effect,
  record or public projection.
- Verdicts: `PASS` (source, code and an asserting independent test agree),
  `FAIL` (a reproducible defect), `UNVERIFIED` (not enough evidence) and
  `HOST-ADJUDICATED` (the pin leaves the decision to the Storyteller; the
  engine must offer only legal options and apply the consequences).
- The information-only decisions are not defects by themselves. The audit
  checks their legal value set, their privacy and their journal entry; it does
  not require the app to choose them.

## Results

| Role | Rule IDs | Official source | Engine behavior | Asserting tests | Consequences verified | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Washerwoman | TB-WASHERWOMAN-01 | [r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630) | First-night one-of-two answer from setup; the zero is not a Washerwoman answer | `the Washerwoman learns a Townsfolk and the Drunk shown the role receives a chosen false pair`; matrix baseline | Pair shape, Townsfolk team, Drunk false pair, no setup accepted with zero | PASS |
| Librarian | TB-LIBRARIAN-01 | [r1721](https://wiki.bloodontheclocktower.com/index.php?title=Librarian&oldid=1721) | Prepared pair or a true zero; false answers are Outsiders | `the Librarian may learn zero with no Outsider and a pair otherwise`; matrix baseline | Zero with no Outsider, pair otherwise, team, no role change | PASS |
| Investigator | TB-INVESTIGATOR-01 | [r2983](https://wiki.bloodontheclocktower.com/index.php?title=Investigator&oldid=2983) | Prepared pair naming a Minion; a Recluse may be the prepared Minion | `the Investigator learns a Minion and a Recluse may be the prepared Minion` | Minion team, pair, Recluse registration, no role change | PASS |
| Chef | TB-CHEF-01, TB-CHEF-02 | [r2510](https://wiki.bloodontheclocktower.com/index.php?title=Chef&oldid=2510) | Counts adjacent evil pairs; a Spy/Recluse makes the count a host choice between the unavoidable minimum and possible maximum | `a sober Chef with no registration ambiguity learns one computed count`; `the Chef's count is a host registration choice and alters no role` | Count, legal range, chosen count, roles and alignments unchanged | PASS; TB-CHEF-02 HOST-ADJUDICATED |
| Empath | TB-EMPATH-01..03 | [r1724](https://wiki.bloodontheclocktower.com/index.php?title=Empath&oldid=1724) | Counts the two nearest living neighbours; Spy/Recluse registration; impaired answers 0, 1, 2 | `the Empath counts a Spy registering good and a Recluse registering evil without changing their roles`; matrix baseline | Count, dead-neighbour skip, registrations, false-number options, no role change | PASS; TB-EMPATH-03 HOST-ADJUDICATED |
| Fortune Teller | TB-FORTUNETELLER-01 | [r3123](https://wiki.bloodontheclocktower.com/index.php?title=Fortune_Teller&oldid=3123) | Yes for a Demon, a red herring or a Recluse registered as a Demon; self and dead targets are legal | `the Fortune Teller says yes for a Demon, the red herring and a Recluse registered as a Demon` | Yes/no values, herring, self target, Recluse registration, no role change | PASS |
| Undertaker | TB-UNDERTAKER-01 | [r3115](https://wiki.bloodontheclocktower.com/index.php?title=Undertaker&oldid=3115) | Wakes only after an execution death; answers the true character, with Spy/Recluse choices | `the Undertaker wakes after an execution death and not after a night death`; `the Undertaker learns the Drunk character, not the shown Townsfolk` | Conditional wake, night death excluded, Drunk character, Spy/Recluse choices | PASS |
| Monk | TB-MONK-01 | [r3124](https://wiki.bloodontheclocktower.com/index.php?title=Monk&oldid=3124) | One protected player other than the Monk, from the Demon, until dawn; a new choice replaces the old | `Monk protection stops the Imp; a poisoned Monk does not`; `the Monk cannot protect themself`; `a Monk protecting the Imp stops its self-kill and creates no new Demon` | Protection, impairment, self rejection, Imp self-kill prevention, protected Mayor | PASS |
| Ravenkeeper | TB-RAVENKEEPER-01 | [r3125](https://wiki.bloodontheclocktower.com/index.php?title=Ravenkeeper&oldid=3125) | Conditional step only on a night death; chooses any player and learns the character; Spy/Recluse choices | `the Ravenkeeper wakes only after a night death, never after an execution`; `the Ravenkeeper may learn a Spy's registered Townsfolk or Outsider character`; `a Mayor redirect to the Ravenkeeper wakes the Ravenkeeper that night` | Wake condition, target, Spy choices, role unchanged, Mayor redirect wake | PASS |
| Virgin | TB-VIRGIN-01 | [r1729](https://wiki.bloodontheclocktower.com/index.php?title=Virgin&oldid=1729) | First nomination spends the ability; a Townsfolk nominator is executed at once; a Spy may register as a Townsfolk; an Outsider or Drunk does not | `a Spy registering as a Townsfolk triggers the Virgin and dies at once`; `a Spy that does not register as a Townsfolk leaves the Virgin alive but spent`; `a Drunk nominator does not trigger the Virgin`; `an Outsider nominator, including the Saint, does not trigger the Virgin` | Execution, day end, spent ability, no trigger for Outsider/Drunk/Spy without registration | PASS |
| Slayer | TB-SLAYER-01 | [r3122](https://wiki.bloodontheclocktower.com/index.php?title=Slayer&oldid=3122) | Once per game by day; a Demon hit is a death, not an execution; a Recluse may register as the Demon; an impaired shot is spent without a kill | `a Slayer kills a Recluse that registers as the Demon without ending the game`; `a Slayer kill on the real Demon wins for good unless an heir exists`; `a poisoned Slayer spends the once-per-game ability without killing`; `a Slayer shot at five alive lets the Scarlet Woman inherit the Demon role` | Hit, miss, no false good win, spent ability, Scarlet Woman inheritance | PASS |
| Soldier | TB-SOLDIER-01 | [r3121](https://wiki.bloodontheclocktower.com/index.php?title=Soldier&oldid=3121) | Safe from the Demon while sober and healthy | `the Soldier is safe from the Imp while sober and dies while poisoned`; `a Drunk shown the Soldier dies to the Imp`; `a Mayor redirect to a living Soldier kills nobody` | Protection, impairment, Drunk mask, Mayor redirect | PASS |
| Mayor | TB-MAYOR-01 | [r2995](https://wiki.bloodontheclocktower.com/index.php?title=Mayor&oldid=2995) | Redirect on a lethal Demon attack; dead, Soldier or Monk-protected redirects kill nobody; the Mayor may die; three alive and no execution win for good | `Mayor redirect to a dead player kills nobody and the Mayor lives`; `Mayor redirect to a living player kills that player instead`; `choosing that the Mayor dies keeps the Demon attack on the Mayor`; `a poisoned Mayor neither redirects nor wins at three alive`; `three alive, no execution, and a sober Mayor win for good`; `an execution of a corpse still blocks the Mayor win`; `a Monk-protected Mayor does not redirect the Imp attack`; `a Drunk shown the Mayor neither redirects nor wins at three alive` | All redirect branches, protection, impairment, win and corpse-execution block, Drunk mask | PASS |
| Butler | TB-BUTLER-01 | [r3120](https://wiki.bloodontheclocktower.com/index.php?title=Butler&oldid=3120) | Master recorded; only the next day's vote is restricted; an illegal vote is counted with a private warning; a dead Butler has no restriction | `the Butler restricts tomorrow's vote to a master's vote and expires at the next dusk`; matrix baseline | Master, restriction window, warning, expiry | PASS |
| Drunk | TB-DRUNK-01 | [r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165) | Shown Townsfolk only; no ability at any phase; the mask never leaks to a bluff or public view | `a Baron adds two Outsiders and the Drunk keeps a false Townsfolk identity`; `the Washerwoman ... Drunk shown ...`; `a Drunk shown the Mayor ...`; `a Drunk shown the Soldier dies to the Imp`; `the public game view exposes no hidden role or setup secret` | Setup, shown role, night wake, false information, Mayor/Soldier behavior, privacy | PASS |
| Recluse | TB-RECLUSE-01..02 | [r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007) | May register as evil, a Minion or a Demon, including dead; only while sober and healthy | `a Slayer kills a Recluse that registers as the Demon ...`; `the Empath counts ... Recluse ...`; `the Fortune Teller ... Recluse registered as a Demon`; `the Investigator ... Recluse ...` | Registration queries, impairment gate, no real role change | PASS |
| Saint | TB-SAINT-01..02 | [r3119](https://wiki.bloodontheclocktower.com/index.php?title=Saint&oldid=3119) | Execution death loses for good; a night death does not; an impaired Saint does not lose | `an executed Saint loses for good; a Saint killed at night does not`; `an impaired Saint executed by the town does not lose the game` | Winner, reason, night death, impairment | PASS |
| Poisoner | TB-POISONER-01 | [r1737](https://wiki.bloodontheclocktower.com/index.php?title=Poisoner&oldid=1737) | Poisoned tonight and tomorrow day, ends at dusk; source death or role change ends it | `poison lasts tonight and the next day and ends at the next dusk`; `a poisoned Slayer ...`; `a poisoned Monk ...`; `a poisoned Mayor ...`; `a poisoned Imp cannot kill itself` | Interval, impairment effects, source loss, self-poison-safe graph | PASS |
| Spy | TB-SPY-01 | [r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118) | Sees the Grimoire every night; may register as good and a Townsfolk or Outsider, including dead | `the Spy sees the Grimoire every night and stores no answer`; `a Spy registering as a Townsfolk triggers the Virgin ...`; `the Ravenkeeper may learn a Spy's registered ...` | Grimoire record, no stored answer, registration consequences, privacy | PASS |
| Scarlet Woman | TB-SCARLETWOMAN-01..02 | [r3117](https://wiki.bloodontheclocktower.com/index.php?title=Scarlet_Woman&oldid=3117) | Inherits when the Demon dies with five or more alive before the death; first in an Imp self-kill; wakes once | `Scarlet Woman inherits a Demon executed with five or more alive`; `Scarlet Woman does not inherit ... fewer than five`; `a Scarlet Woman must inherit an Imp self-kill at ten alive ...`; `a poisoned Scarlet Woman ...`; `a daytime ... wakes the new Demon the next night`; `a night ... wakes ... that night and not again` | Threshold, poison, multi-Minion, execution/self-kill/Slayer, wake timing | PASS |
| Baron | TB-BARON-01 | [r2961](https://wiki.bloodontheclocktower.com/index.php?title=Baron&oldid=2961) | +2 Outsiders, −2 Townsfolk at setup | `a Baron adds two Outsiders and the Drunk keeps a false Townsfolk identity`; matrix baseline | Composition table, Drunk slot, 5–15 legal bags | PASS |
| Imp | TB-IMP-01 | [r3116](https://wiki.bloodontheclocktower.com/index.php?title=Imp&oldid=3116) | Kills each night after the first; a self-kill passes the role to an alive Minion; the new Demon does not act again that night | `Imp self-kill with one Minion passes the Demon role at once`; `Imp self-kill with two Minions needs the host's heir choice`; `an Imp self-kill with no living Minion wins for good`; `a Monk protecting the Imp stops its self-kill ...`; `a poisoned Imp cannot kill itself ...`; `an Imp attack on a healthy Soldier ...` | Death, self-kill, heir, no heir, protection, impairment, new Demon wake | PASS |

## Host-adjudicated decisions

- **Chef count (`TB-CHEF-02`).** The engine offers the unavoidable minimum to
  the possible maximum; the host's answer is recorded as a registration
  ambiguity. The audit confirms the legal range and that the roles, teams and
  other abilities do not change.
- **Spy/Recluse registrations.** The generic registration map exposes only
  `spy: good` and `recluse: evil | demon`. Every TB query that needs the other
  values has a dedicated control: the setup pair for the Washerwoman, Librarian
  and Investigator; the `spyRegistersTownsfolk` option for the Virgin;
  `recluseRegistersDemon` for the Slayer; the character choices for the
  Undertaker and Ravenkeeper; and the per-step registration map for the Chef
  and Empath.
- **Impaired information.** The host chooses a legal value from the offered
  options; the audit confirms the true role, alignment and effects do not
  change and that the false answer is journaled as a host choice.

## Cross-role interactions re-checked

- **Mayor / Monk / Soldier / Ravenkeeper:** a protected Mayor does not redirect;
  a redirect to a dead, Soldier or Monk-protected player kills nobody; a
  redirect to the Ravenkeeper wakes them the same night.
- **Imp / Scarlet Woman / Poisoner:** the threshold counts players alive before
  the death; the Scarlet Woman inherits before the Imp's own self-kill pass; a
  poisoned Scarlet Woman does not inherit, and the Imp's pass then becomes a
  host choice; the new Demon wakes once.
- **Virgin / Spy / Drunk / Saint:** only a Townsfolk nominator triggers; a
  registering Spy counts; a Drunk or another Outsider does not; the ability is
  spent even without a trigger; a Spy's registration changes no real role.
- **Slayer / Recluse / Scarlet Woman:** a Recluse registered as the Demon dies
  without a good win; a real Demon hit wins unless the Scarlet Woman inherits.
- **Poisoner / every role:** poison is active on the night and the next day,
  ends at dusk, and every impaired information role offers false values while
  leaving the real state unchanged.

## Verification

Branch `test/tb-rule-audit-217`, based on `origin/dev` `d8a5017` (`0.4.0`).

- `node --test src/core/engine/tb-audit.test.ts` -> 59 tests, 59 pass, 0 fail.
- `npm test` -> 1254 tests, 1254 pass, 0 fail.
- `npm run typecheck` -> pass.
- `npx oxlint src scripts vite.config.ts` -> `ok`. (`npm run lint` fails inside
  the local RTK wrapper with `ESLint output (JSON parse failed)`, not with an
  oxlint diagnostic; the direct binary passes.)
- `npm run format:check` -> pass.
- `npm run build`, `npm run fallback`, `npm run offline` -> pass.
- `node scripts/check-types-policy.ts`, `check-official.ts`,
  `check-acceptance.ts`, `check-version.ts`, `role-ownership.ts --check` ->
  pass.
- Playwright: `PG_BROWSER_CHECK=mayor-redirect|heir-question|chef-label|setup-zero|demon-wake node scripts/browser-check.ts`
  -> all pass.
- Full-game scenarios: `BASE_PATH=/pocket/ npx vite build --mode test`, then
  `npm run scenarios` -> 10/10 scenarios passed.

## Remaining limitations and blockers for Stable

- The Drunk shown the Slayer has no table action: the shot always fails by the
  rules, so no game state is wrong, but the public attempt cannot be recorded
  as a Slayer action. The host resolves it at the table.
- A Washerwoman/Librarian/Investigator pair prepared with an unimpaired Spy or
  Recluse is not revalidated when that registrant becomes poisoned during the
  first night. The host can correct the prepared answer in `/secrets`; the
  information is host-adjudicated, not a state consequence.
- The generic registration map still lacks the Spy's Townsfolk/Outsider and the
  Recluse's Minion values; every TB query uses a dedicated control.
- `npm run lint` inside the local RTK wrapper is the only failing verify step;
  oxlint itself passes.
- This change is a test and audit artifact. It is not merged, so the
  independent sign-off on the final `main` is still pending the owner's merge.

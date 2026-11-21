# Shared rules

Cross-cutting rules for the rows of `docs/rules-matrix.md` that are not per-role
rows. Every such row carries exactly one `SYS-<AREA>-NN` identifier in its first
column, and this document declares each of those identifiers with the row's
level, its pinned source and the asserting tests. It cites sources instead of
copying wiki text, and it never overrides a role's `rule.md`.

`SYS-SETUP` covers composition, the bag and the bluffs. `SYS-NIGHT` covers the
night order and the wake rules. `SYS-EFFECTS` covers impairment, registration and
the effect graph. `SYS-VOTES` and `SYS-WINS` cover the day decision. `SYS-STATE`
covers commands, the journal and saved data. `SYS-SCRIPTS`, `SYS-PRIVACY` and
`SYS-I18N` cover imported scripts, the public projections and localization.

A verified rule names at least one test whose name carries its identifier. A row
with no asserting test stays `implemented-unverified` or `host-choice` in the
matrix. An `app contract` revision marks a rule owned by this application rather
than by a wiki page; it has no wiki revision to pin.

## Setup and composition

| Rule ID      | Level    | Matrix revision | Asserting tests                                                                                                                                                       |
| ------------ | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SYS-SETUP-01 | verified | r1361           | `src/core/engine/setup.test.ts` "the official composition table covers 5 to 15 players exactly (SYS-SETUP-01)"; `src/core/engine/engine.test.ts` "composition table is exact and Baron shifts two Townsfolk to Outsiders (TB-BARON-01)"; `src/core/model/scripts.test.ts` "rejects scripts that are too small or miss a required team" |
| SYS-SETUP-02 | verified | r1361           | `src/core/engine/engine.test.ts` "random bags are legal for every supported size (SYS-SETUP-02)"; `src/core/engine/setup.test.ts` "a deal rejects an assignment that is not a permutation of the bag" |
| SYS-SETUP-03 | verified | r1361           | `src/core/model/presets.test.ts` "derived extras use only unused good roles for bluffs (SYS-SETUP-03)"; `src/core/engine/engine.test.ts` "the first-night evil introduction names the exact Minions, Demon and bluffs (INFO-004, INFO-005)" |
| SYS-SETUP-04 | verified | r1361           | `src/core/engine/engine.test.ts` "5–6 player first night has no evil introduction and no bluffs (SYS-SETUP-04)"; `src/core/engine/engine.test.ts` "the first-night evil introduction names the exact Minions, Demon and bluffs (INFO-004, INFO-005)" |
| SYS-SETUP-05 | verified | r3168           | `src/core/engine/engine.test.ts` "every dealt player begins on the team their character prints (SYS-SETUP-05)"; `src/core/engine/setup.test.ts` "a deal rejects an assignment that is not a permutation of the bag"; `src/core/engine/bmr.test.ts` "the Assassin kills the Goon and the Goon still turns evil (BMR-ASSASSIN-01)"; `src/core/engine/snv.test.ts` "the Pit-Hag replaces a character atomically (SNV-PITHAG-01)" |

## Night

| Rule ID      | Level    | Matrix revision     | Asserting tests                                                                                                                                                       |
| ------------ | -------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SYS-NIGHT-01 | verified | r3128/r2871/r3127   | `src/core/engine/bmr.test.ts` "Bad Moon Rising rosters, composition and night order follow the official data (SYS-NIGHT-01)"; `src/core/roles/night-step.test.ts` "an arm for other nights declares nothing on the first night"; `src/core/roles/night-step.test.ts` "a legacy first-night step replaces the night step on the first night only"                                           |
| SYS-NIGHT-02 | verified | r3128/r2871/r3127   | `src/core/engine/engine.test.ts` "Ravenkeeper wakes after a night death and learns a character (TB-RAVENKEEPER-01, SYS-NIGHT-02)"; `src/core/engine/snv.test.ts` "a character created mid-game gains its start-knowing information that night (INFO-006, ROLE-PITHAG-003, SNV-PITHAG-01)"; `src/core/engine/snv.test.ts` "a player the Pit-Hag makes the Town Crier wakes in its slot and one made the Clockmaker wakes at once (INFO-006, SNV-PITHAG-01)"                                      |
| SYS-NIGHT-03 | verified | r3128/r2871/r3127   | `src/core/engine/engine.test.ts` "a player killed before their night wake is skipped (SYS-NIGHT-03)"                                                                   |

## Effects

| Rule ID        | Level    | Matrix revision                                                                                        | Asserting tests                                                                                                                                                                                                         |
| -------------- | -------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SYS-EFFECTS-01 | verified | r1039                                                                                                  | `src/core/engine/engine.test.ts` "every Trouble Brewing first-night information role offers allowed false information while impaired (SYS-EFFECTS-01, TB-EMPATH-03)"                                                     |
| SYS-EFFECTS-02 | verified | r3118/r3007                                                                                            | `src/core/engine/engine.test.ts` "Spy and Recluse registrations are explicit host choices (TB-RECLUSE-01, SYS-EFFECTS-02)"; `src/core/engine/engine.test.ts` "registration changes the reading and grants no character ability (STATUS-012)"; `src/core/engine/tb-audit.test.ts` "a Spy registering as a Townsfolk triggers the Virgin and dies at once (TB-VIRGIN-01, TB-SPY-01)"                                                                                             |
| SYS-EFFECTS-03 | verified | [Owner decision](https://github.com/hose1021/pocket-grimoire-go/pull/24#issuecomment-6764787575)       | `src/core/engine/commands.test.ts` "effect start and expiry bound impairing effects (SYS-EFFECTS-03)"; `src/core/engine/commands.test.ts` "a source impaired by poison and drunk loses its own effects"; `scripts/verification/findings.test.ts` "F-010 both drunk and poisoned are true display states"                                                                                                                    |
| SYS-EFFECTS-04 | verified | [Owner decision](https://github.com/hose1021/pocket-grimoire-go/pull/24#issuecomment-6764787575)       | `src/core/engine/commands.test.ts` "a three-source poison cycle is rejected (SYS-EFFECTS-04)"; `src/core/engine/commands.test.ts` "a permanent effect on its own source resolves beside that source's own poison (SYS-EFFECTS-04, BMR-GOON-01)"; `src/core/engine/commands.test.ts` "a permanent effect holds while its source is already poisoned, in either visiting order (SYS-EFFECTS-04, BMR-GOON-01)"; `src/core/engine/commands.test.ts` "a same-night pair of a player's effects on themself is still a cycle unless one is permanent (SYS-EFFECTS-04)"; `src/core/engine/commands.test.ts` "a Vigormortis poison still waits for its dead Minion, so a cycle through that Minion is rejected (SYS-EFFECTS-04, SNV-VIGORMORTIS-02)"                                                                                                                            |
| SYS-EFFECTS-05 | verified | r3168           | `src/core/engine/engine.test.ts` "a dead player's persistent ability effects end immediately (SYS-EFFECTS-05)"                                                          |
| SYS-EFFECTS-06 | verified | r3168           | `src/core/engine/engine.test.ts` "a once-per-game ability spent while impaired stays spent after recovery (SYS-EFFECTS-06)"                                              |
| SYS-EFFECTS-07 | verified | r1039           | `src/core/engine/engine.test.ts` "an ability returns when its owner becomes sober, except a spent once-per-game (SYS-EFFECTS-07)"; `src/core/engine/engine.test.ts` "a once-per-game ability spent while impaired stays spent after recovery (SYS-EFFECTS-06)" |

## Nominations and votes

| Rule ID      | Level    | Matrix revision | Asserting tests                                                                                                                                                       |
| ------------ | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SYS-VOTES-01 | verified | r1310           | `src/core/engine/engine.test.ts` "a living player may nominate only once per day and a player may be nominated only once per day (SYS-VOTES-01)"                       |
| SYS-VOTES-02 | verified | r1310           | `src/core/engine/engine.test.ts` "execution requires at least half the living players (SYS-VOTES-02)"                                                                  |
| SYS-VOTES-03 | verified | r1310           | `src/core/engine/engine.test.ts` "dead votes count once, are spent on a failed nomination, and cannot repeat (SYS-VOTES-03)"                                           |
| SYS-VOTES-04 | verified | r3168/r1310     | `src/core/engine/engine.test.ts` "the unique most-voted nominee is executed, and a tie blocks every execution (SYS-VOTES-04)"                                          |

## WINS

| Rule ID     | Level    | Matrix revision | Asserting tests                                                                                                                                                       |
| ----------- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SYS-WINS-01 | verified | r1310           | `src/core/engine/engine.test.ts` "execution is an execution event, not automatically a death (SYS-WINS-01)"; `src/core/engine/engine.test.ts` "official execution of a dead player records an event without another death"; `src/core/engine/engine.test.ts` "a dead player may be executed again on a later day without a second death (EXEC-007)"; `src/core/engine/bmr.test.ts` "a Tea Lady's protected neighbour survives an execution (BMR-TEALADY-01)"; `src/core/engine/bmr.test.ts` "the Mastermind extra day ends good when nobody is executed (BMR-MASTERMIND-01)"                                                            |
| SYS-WINS-02 | verified | r1310           | `src/core/engine/engine.test.ts` "win priorities: no living Demon is checked before the two-alive evil win (SYS-WINS-02)"; `src/core/engine/engine.test.ts` "an Imp kill that leaves two players alive ends the game from the attack step (TB-IMP-01)"; `src/core/engine/snv.test.ts` "an Evil Twin killed by the Vigormortis still wins on the good twin's execution (SNV-EVILTWIN-01)"; `src/core/engine/bmr.test.ts` "an evil player executed on the Mastermind extra day loses for evil (BMR-MASTERMIND-01)"                                              |

## Replay and state

| Rule ID      | Level    | Matrix revision | Asserting tests                                                                                                                                                       |
| ------------ | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SYS-STATE-01 | verified | app contract    | `src/core/engine/engine.test.ts` "completed night steps and recorded votes cannot be applied twice (SYS-STATE-01)"                                                     |
| SYS-STATE-02 | verified | app contract    | `src/core/engine/commands.test.ts` "apply is idempotent by command id and rejects id conflicts (SYS-STATE-02)"                                                          |
| SYS-STATE-03 | verified | app contract    | `src/core/engine/commands.test.ts` "replay rebuilds the saved state from the recorded journal (SYS-STATE-03)"                                                           |
| SYS-STATE-04 | verified | app contract    | `src/ui/screens/table/step-draft.test.ts` "a reload in the middle of a night step restores the step and its chosen targets (SYS-STATE-04)"                             |
| SYS-STATE-05 | verified | app contract    | `src/entry/store.test.ts` "a v3 save migrates to v4 with the Trouble Brewing script (SYS-STATE-05)"                                                                     |
| SYS-STATE-06 | verified | app contract    | `src/core/engine/engine.test.ts` "migration, export/import and public projection keep secrets out of public data (SYS-STATE-06, SYS-PRIVACY-01)"                      |


## Lifecycle

| Rule ID          | Level    | Matrix revision       | Asserting tests                                                                                                                                              |
| ---------------- | -------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SYS-LIFECYCLE-01 | verified | r1310; app contract   | `src/core/engine/lifecycle.test.ts` "a full play cycle follows the declared transitions (SYS-LIFECYCLE-01)"; `src/core/engine/lifecycle.test.ts` "ending the night in the day is rejected and keeps the day intact (SYS-LIFECYCLE-01)" |
| SYS-LIFECYCLE-02 | verified | app contract          | `src/core/engine/lifecycle.test.ts` "the lifecycle guard rejects each command outside its declared phases (SYS-LIFECYCLE-02)"; `src/core/engine/lifecycle.test.ts` "a bag roster reset during the night returns to setup (SYS-LIFECYCLE-02)"; `src/core/engine/lifecycle.test.ts` "a bag edit without a roster reset is rejected during the night (SYS-LIFECYCLE-02)" |

## Scripts

| Rule ID        | Level                 | Matrix revision                          | Asserting tests                                                                                                                                                                                 |
| -------------- | --------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SYS-SCRIPTS-01 | verified              | docs/official/*.json (2026-11-03)        | `src/core/model/scripts.test.ts` "parses the official script tool JSON and keeps its meta name and author (SYS-SCRIPTS-01)"                                                                     |
| SYS-SCRIPTS-02 | verified              | docs/official/*.json (2026-11-03)        | `src/core/model/scripts.test.ts` "rejects unknown, unsupported and traveller-only additions with a clear message (SYS-SCRIPTS-02, SYS-SCRIPTS-03)"                                              |
| SYS-SCRIPTS-03 | verified              | docs/official/roles.json (2026-11-03)    | `src/core/model/scripts.test.ts` "rejects unknown, unsupported and traveller-only additions with a clear message (SYS-SCRIPTS-02, SYS-SCRIPTS-03)"                                              |
| SYS-SCRIPTS-04 | verified              | r3128/r2871/r3127                        | `src/core/engine/manual.test.ts` "a same-edition custom script uses the supported Trouble Brewing engine (SYS-SCRIPTS-04)"                                                                      |
| SYS-SCRIPTS-05 | verified              | app contract                             | `src/core/engine/manual.test.ts` "a mixed pool without manual-only mode is rejected before dealing (SYS-SCRIPTS-05)"; `src/core/engine/setup.test.ts` "script limits reject mixed editions, unknown roles and short rosters"                                                                            |
| SYS-SCRIPTS-06 | verified              | app contract                             | `src/core/engine/manual.test.ts` "a mixed-edition custom script deals and plays in manual-only mode (SYS-SCRIPTS-06)"                                                                           |
| SYS-SCRIPTS-07 | verified              | app contract                             | `src/core/model/support.test.ts` "every supported role has an explicit support level that matches the rules matrix (SYS-SCRIPTS-07)"                                                            |
| SYS-SCRIPTS-08 | verified              | docs/official/jinxes.json (2026-11-11)   | `src/core/model/support.test.ts` "the jinx table is versioned and every applicable pair has a source and a reason (SYS-SCRIPTS-08)"                                                              |
| SYS-SCRIPTS-09 | verified              | app contract                             | `src/core/engine/commands.test.ts` "unsupported ruleset versions are rejected before any mutation (SYS-SCRIPTS-09)"                                                                             |
| SYS-SCRIPTS-10 | verified              | app contract                             | `src/core/engine/manual.test.ts` "manual-only mode is rejected for a same-edition script (SYS-SCRIPTS-10)"                                                                                       |

## Privacy

| Rule ID        | Level    | Matrix revision | Asserting tests                                                                                                                                                       |
| -------------- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SYS-PRIVACY-01 | verified | app contract    | `src/core/engine/engine.test.ts` "migration, export/import and public projection keep secrets out of public data (SYS-STATE-06, SYS-PRIVACY-01)"; `src/ui/screens/player-projection.test.ts` "the player handoff projection carries only public seat data, the shown role and the Goon alignment"; `src/ui/screens/player-projection.test.ts` "the Goon's own alignment reaches the player handoff (BMR-GOON-01)"; `src/core/engine/acceptance.test.ts` "a played finale replays to the same state and exposes no secrets"                      |

## Localization

| Rule ID      | Level                 | Matrix revision | Asserting tests                                                                                                                                                       |
| ------------ | --------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SYS-I18N-01  | verified              | app contract    | `src/ui/i18n/strings.test.ts` "English, Russian and Azerbaijani have matching translation keys and parameters (SYS-I18N-01)"                                          |
| SYS-I18N-02  | verified              | app contract    | `src/ui/i18n/role-catalog.test.ts` "the role catalogs carry every supported ability (SYS-I18N-02)"; `src/ui/i18n/role-catalog.test.ts` "the audited role abilities keep their mechanical terms (SYS-I18N-02)" |

# Known findings (findings gate is red)

The findings gate fails on purpose. A green baseline would present known defects
as correctness. Each row is a regression test in
`scripts/verification/findings.test.ts`; the linked issue owns the fix, and the
test must become behavioural before it can stand as evidence. Nine of the
eighteen tests still assert production source text; the engine-side ones
(F-002, F-009, F-017) are behavioural, and F-002, F-009, F-015, F-017 and F-021
pass on this branch.

| Finding | Test | Issue | Audited status |
|---|---|---|---|
| F-001 survives without a legal Pacifist | `F-001 the UI does not offer survives from a broad role list` | #317 | open; text assertion. `survivalAllowed` is module-private, so the fix needs a read-model projection, not a direct call. |
| F-002 mandatory skip / Po no-one | `F-002 a mandatory living night step cannot be skipped` | #318 | **fixed** by #339, merged into `dev`: `skipStep` refuses a living actor's mandatory step with `error.80` at `tb-bmr-snv-2026-11-19`, optional and dead-actor skips stay allowed, and the console names the Po's no-one action. Behavioural; passes. |
| F-003 Klutz day choice | `F-003 the UI calls recordKlutzChoice for a day death` | #319 | open; **the command exists** (`commands.ts`, `sv.ts`); the day control is missing. Text assertion. |
| F-004 borrowed day ability | `F-004 a Philosopher can use a borrowed Slayer` | #320 | open. Juggler and Klutz already use `hasAbility`; stale call sites are Slayer, Tinker, Virgin and Moonchild. Behavioural. |
| F-005 impaired card given | `F-005 an impaired card opens for a chosen given answer` | #321 | open; text assertion. |
| F-006 stale given | `F-006 a target change drops the previous given answer` | #322 | open; text assertion. |
| F-007 stale template | `F-007 a step change clears the shared information template` | #322 | open; text assertion. |
| F-008 stale execution target | `F-008 a day change clears the execution target and survives flag` | #322 | open; text assertion. |
| F-009 registered-dead Zombuul vote | `F-009 a registered-dead Zombuul cannot nominate and spends its vote token` | #313 | **fixed** by #334, merged into `dev`: the nomination is rejected, the first vote spends the token, the second is not counted. Behavioural; passes. The execution threshold stays unchanged by the reviewed #334 scope. |
| F-010 combined drunk+poisoned | `F-010 both drunk and poisoned are true display states` | #331 | open; behavioural selector test. |
| F-011 `/secrets` done mark | `F-011 the /secrets done mark follows the engine's secrets errors` | #324 | open; text assertion. |
| F-012 setup options | `F-012 a registering Spy does not make every not-in-play role legal without the pair` | #324 | open; behavioural helper test. |
| F-013 dead execution spec | `F-013 the spec allows a dead player to be executed` | #327 | open; the spec contradicts the engine and the pinned States text; markdown assertion. |
| F-014 Witch/correction surface | `F-014 the correction form exposes effect and shown changes` | #325 | open; text assertion. |
| F-015 role catalog semantics | `F-015 the Russian Empath ability states the two-neighbour count` | #326 | **fixed**: the shipped Russian Empath ability states `2 живых соседей`; the data assertion on the real catalog passes. |
| F-017 mid-game seat reorder | `F-017 a mid-game seat reorder needs an explicit correction` | #328 | **fixed** by this PR: `setOrder` runs only in setup, deal and seat; a live day or night is rejected with `error.47` and the seat screen locks. Behavioural; passes. |
| F-018 notes per keystroke | `F-018 notes do not dispatch on every character` | #330 | open; text assertion. |
| F-021 step gate oracle | `F-021 the step given gate has a unit oracle` | #329 | **passes**: the step-context test exists; mutation records the `needsGiven` probe caught. |

Additional red data:

- 23 UI contracts are not gate-covered; see `uncovered.json`. Their evidence is
  `STATIC_VERIFIED`, `UNREACHABLE`, `OUT_OF_SCOPE` or non-compliant.
- 2 engine rules are `implemented-unverified` (`BMR-PUKKA-06`, `SYS-I18N-02`);
  19 `host-choice` rows are Storyteller decisions, not defects.
- `recordKlutzChoice` is the only legal action with no UI caller; the other
  `internal` commands are host-internal by design.
- Stale matrix citations are fatal for a `verified` engine rule, so the verified
  gate cannot pass while a row names a test that does not exist.
- Contract-to-test links are free text: a browser scenario name is checked
  against the suite index, a node test file is not checked against the
  contract's rule IDs.

## Register: test, issue, observable assertion

| Test | Issue | Kind | Observable assertion |
|---|---|---|---|
| F-001 the UI does not offer survives from a broad role list | #317 | source text | the day card no longer hardcodes five role ids |
| F-002 a mandatory living night step cannot be skipped | #318 | behaviour | `skipStep` on a non-optional step returns `ok:false` |
| F-003 the UI calls recordKlutzChoice for a day death | #319 | source text | a day control dispatches the existing command |
| F-004 a Philosopher can use a borrowed Slayer | #320 | behaviour | `useSlayer` accepts a Philosopher with the borrowed ability |
| F-005 an impaired card opens for a chosen given answer | #321 | source text | the card gate includes the given answer |
| F-006 a target change drops the previous given answer | #322 | source text | `dropGiven` runs on a target change |
| F-007 a step change clears the shared information template | #322 | source text | the template resets on a step change |
| F-008 a day change clears the execution target and survives flag | #322 | source text | both draft values reset on a day change |
| F-009 a registered-dead Zombuul cannot nominate and spends its vote token | #313 | behaviour | nomination rejected; first vote counted and token spent; later vote ignored |
| F-010 both drunk and poisoned are true display states | #331 | behaviour | `seatBadges` returns both states |
| F-011 the /secrets done mark follows the engine's secrets errors | #324 | source text | the mark derives from `secretsErrors` |
| F-012 a registering Spy does not make every not-in-play role legal without the pair | #324 | behaviour | `infoRoleChoices` omits the not-in-play role without the registering player |
| F-013 the spec allows a dead player to be executed | #327 | spec text | the requirement matches SYS-WINS-01 and States r1039 |
| F-014 the correction form exposes effect and shown changes | #325 | source text | both correction controls exist |
| F-015 the Russian Empath ability states the two-neighbour count | #326 | data | the shipped catalog entry carries `2` |
| F-017 a mid-game seat reorder needs an explicit correction | #328 | behaviour | `lifecycleGuard(state, "setOrder")` rejects a live day |
| F-018 notes do not dispatch on every character | #330 | source text | the notes field does not dispatch per keystroke |
| F-021 the step given gate has a unit oracle | #329 | manifest | the step-context test exists |

## Counting failures and gaps

Three different numbers appear in the reports; they measure different things.

| Number | Meaning |
|---|---|
| **13** | failing tests in `findings.test.ts` on this branch: F-002, F-009, F-015, F-017 and F-021 pass; the other 13 findings remain open. |
| **25** | coverage gaps in the findings gate on CI: 22 UI contracts without gate-covered compliant evidence, 2 `implemented-unverified` engine rows (`BMR-PUKKA-06`, `SYS-I18N-02`), 1 legal action with no UI caller (`recordKlutzChoice`). |
| **27** | failing lines in the findings job on this PR: the 25 gaps, one bootstrap note (the base `dev` has no committed manifest yet because that PR added it) and one aggregate line for the red regression suite. |
| **26** | the same with a base branch that already has the manifest (`VERIFICATION_BASE_REF=<sha>`). |

The verified gate on CI reports the same 25 gaps as recorded findings and still passes; it is an integrity gate, not the defect register.

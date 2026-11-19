# Known findings (findings gate is red)

The findings gate fails on purpose. A green baseline would present known defects
as correctness. Each row is a regression test in
`scripts/verification/findings.test.ts`; the linked issue owns the fix, and the
test must become behavioural before it can stand as evidence. Eleven of the
seventeen tests assert production source text, not behaviour; they reproduce the
defect but do not prove a fix.

| Finding | Test | Issue | Audited status |
|---|---|---|---|
| F-001 survives without a legal Pacifist | `F-001 the UI does not offer survives from a broad role list` | #317 | open; text assertion. `survivalAllowed` is module-private, so the fix needs a read-model projection, not a direct call. |
| F-002 mandatory skip / Po no-one | `F-002 a mandatory living night step cannot be skipped` | #318 | **partly fixed**: the Po records `poNoOne` (`roles/po/role.ts:22`, asserted in `bmr.test.ts`); `skipStep` still ignores `optional`. Behavioural. |
| F-003 Klutz day choice | `F-003 the UI calls recordKlutzChoice for a day death` | #319 | open; **the command exists** (`commands.ts`, `sv.ts`); the day control is missing. Text assertion. |
| F-004 borrowed day ability | `F-004 a Philosopher can use a borrowed Slayer` | #320 | open. Juggler and Klutz already use `hasAbility`; stale call sites are Slayer, Tinker, Virgin and Moonchild. Behavioural. |
| F-005 impaired card given | `F-005 an impaired card opens for a chosen given answer` | #321 | open; text assertion. |
| F-006 stale given | `F-006 a target change drops the previous given answer` | #322 | open; text assertion. |
| F-007 stale template | `F-007 a step change clears the shared information template` | #322 | open; text assertion. |
| F-008 stale execution target | `F-008 a day change clears the execution target and survives flag` | #322 | open; text assertion. |
| F-009 registered-dead Zombuul vote | `F-009 the day vote path follows registersAlive` | #313 | open; text assertion over the function body. |
| F-010 combined drunk+poisoned | `F-010 both drunk and poisoned are true display states` | #331 | open; behavioural selector test. |
| F-011 `/secrets` done mark | `F-011 the /secrets done mark follows the engine's secrets errors` | #324 | open; text assertion. |
| F-012 setup options | `F-012 a registering Spy does not make every not-in-play role legal without the pair` | #324 | open; behavioural helper test. |
| F-013 dead execution spec | `F-013 the spec allows a dead player to be executed` | #327 | open; the spec contradicts the engine and the pinned States text; markdown assertion. |
| F-014 Witch/correction surface | `F-014 the correction form exposes effect and shown changes` | #325 | open; text assertion. |
| F-015 role catalog semantics | `F-015 the Russian Empath ability states the two-neighbour count` | #326 | open; data assertion on the real catalog. |
| F-017 mid-game seat reorder | `F-017 setOrder is not a free mid-game action` | #328 | open; owner decision required. Text assertion. |
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

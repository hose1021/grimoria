# Known findings (findings gate is red)

The findings gate is deliberately failing. A temporary green baseline is not used. Each row is an executable regression test in `scripts/verification/findings.test.ts`; the linked issue owns the fix and the test must pass before the findings job becomes required.

| Finding | Test | Issue | Required fix |
|---|---|---|---|
| F-001 survives without a legal Pacifist | `F-001 the UI does not offer survives from a broad role list` | #317 | derive the control from `survivalAllowed`; add browser cases |
| F-002 mandatory skip / Po no-one | `F-002 a mandatory living night step cannot be skipped` | #318 | reject non-optional skip; Po no-one records `poNoOne` |
| F-003 Klutz day choice | `F-003 the UI calls recordKlutzChoice for a day death` | #319 | day panel + command + browser case |
| F-004 borrowed day ability | `F-004 a Philosopher can use a borrowed Slayer` | #320 | `hasAbility` in Slayer/Tinker/Virgin/Juggler/Moonchild/Klutz |
| F-005 impaired card given | `F-005 an impaired card opens for a chosen given answer` | #321 | enable card when `given` exists; independent browser oracle |
| F-006 stale given | `F-006 a target change drops the previous given answer` | #322 | drop/revalidate given on target change |
| F-007 stale template | `F-007 a step change clears the shared information template` | #322 | key by step or clear on step change |
| F-008 stale execution target | `F-008 a day change clears the execution target and survives flag` | #322 | clear on day/phase transition |
| F-009 registered-dead Zombuul vote | `F-009 the day vote path follows registersAlive` | #313 | engine uses `registersAlive`; UI regression after |
| F-010 combined drunk+poisoned | `F-010 both drunk and poisoned are true display states` | #331 | both badges/combined with sources |
| F-011 `/secrets` done mark | `F-011 the /secrets done mark follows the engine's secrets errors` | #324 | `infoDone` from `secretsErrors` |
| F-012 setup options | `F-012 a registering Spy does not make every not-in-play role legal without the pair` | #324 | options depend on the chosen pair/engine |
| F-013 dead execution spec | `F-013 the spec allows a dead player to be executed` | #327 | align spec with EXEC-007 |
| F-014 Witch/correction surface | `F-014 the correction form exposes effect and shown changes` | #325 | Witch form; `effect`/`shown` corrections |
| F-015 role catalog semantics | `F-015 the Russian Empath ability states the two-neighbour count` | #326 | correct role catalog; semantic test |
| F-017 mid-game seat reorder | `F-017 setOrder is not a free mid-game action` | #328 | owner decision; gate/warning |
| F-018 notes per keystroke | `F-018 notes do not dispatch on every character` | #330 | debounce/blur |
| F-021 step gate oracle | `F-021 the step given gate has a unit oracle` | #329 | **passes**: the new step-context test exists |

Additional red data:

- `UI-021`, `UI-023`, `UI-035`, `UI-039`, `UI-040`, `UI-041`, `UI-045`, `UI-046`, `UI-048`, `UI-049`, `UI-053`, `UI-057`, `UI-061`, `UI-063`, `UI-073`, `UI-074`, `UI-080`, `UI-081`, `UI-082`, `UI-083`, `UI-084`, `UI-085`, `UI-086` are not gate-covered; see `uncovered.json`.
- `BMR-PUKKA-06` and `SYS-I18N-02` are `implemented-unverified`; the 21 weak engine rows are host-choice, not a defect, but they are recorded.
- `recordKlutzChoice` is the only command with no UI caller.
- 51 stale matrix citations are reported by the verified gate as findings (not failures): the matrix still cites some old test names. The current test manifest is the source of truth; the stale citations should be cleaned in the matrix.

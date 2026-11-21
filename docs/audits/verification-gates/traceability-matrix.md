# Official Rule → Engine Test → UI Contract traceability

Generated from `traceability.json` by `scripts/verification/render-matrix.ts`. Do not edit by hand.

## Summary

| Metric | Count |
|---|---:|
| Official rules | 523 |
| ROLE_LEVEL_ONLY | 250 |
| ENGINE_VERIFIED | 261 |
| ENGINE_PARTIAL | 12 |
| Engine rules | 172 |
| UI contracts | 87 |
| Official rules with no dedicated UI surface | 211 |

A row is a **mapping**, not a proof of sentence-level equivalence. `ENGINE_VERIFIED` means at least one current engine test carries an engine rule ID; `ENGINE_PARTIAL` means at least one host-choice or unverified row weakens the rule. The official rule may be broader than the mapped engine rows.

## Official rules

| Official rule | Status | Engine rules | Current engine tests | UI contracts | UI tests | Note |
|---|---|---|---|---|---|---:|---|
| CORE-001 | `ROLE_LEVEL_ONLY` | SYS-LIFECYCLE-01<br>SYS-LIFECYCLE-02<br>SYS-WINS-01<br>SYS-WINS-02 | 13 | UI-017<br>UI-018<br>UI-021<br>UI-028<br>UI-036<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-067 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| CORE-002 | `ENGINE_VERIFIED` | SYS-LIFECYCLE-01 | 2 | UI-017<br>UI-028<br>UI-036<br>UI-064<br>UI-067 | 5 |  |
| CORE-003 | `ROLE_LEVEL_ONLY` | SYS-LIFECYCLE-01<br>SYS-LIFECYCLE-02<br>SYS-WINS-01<br>SYS-WINS-02 | 13 | UI-017<br>UI-018<br>UI-021<br>UI-028<br>UI-036<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-067 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| CORE-004 | `ROLE_LEVEL_ONLY` | SYS-LIFECYCLE-01<br>SYS-LIFECYCLE-02<br>SYS-WINS-01<br>SYS-WINS-02 | 13 | UI-017<br>UI-018<br>UI-021<br>UI-028<br>UI-036<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-067 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| CORE-005 | `ROLE_LEVEL_ONLY` | SYS-LIFECYCLE-01<br>SYS-LIFECYCLE-02<br>SYS-WINS-01<br>SYS-WINS-02 | 13 | UI-017<br>UI-018<br>UI-021<br>UI-028<br>UI-036<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-067 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| CORE-006 | `ROLE_LEVEL_ONLY` | SYS-LIFECYCLE-01<br>SYS-LIFECYCLE-02<br>SYS-WINS-01<br>SYS-WINS-02 | 13 | UI-017<br>UI-018<br>UI-021<br>UI-028<br>UI-036<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-067 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| CORE-007 | `ROLE_LEVEL_ONLY` | SYS-LIFECYCLE-01<br>SYS-LIFECYCLE-02<br>SYS-WINS-01<br>SYS-WINS-02 | 13 | UI-017<br>UI-018<br>UI-021<br>UI-028<br>UI-036<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-067 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| CORE-008 | `ROLE_LEVEL_ONLY` | SYS-LIFECYCLE-01<br>SYS-LIFECYCLE-02<br>SYS-WINS-01<br>SYS-WINS-02 | 13 | UI-017<br>UI-018<br>UI-021<br>UI-028<br>UI-036<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-067 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| CORE-009 | `ROLE_LEVEL_ONLY` | SYS-LIFECYCLE-01<br>SYS-LIFECYCLE-02<br>SYS-WINS-01<br>SYS-WINS-02 | 13 | UI-017<br>UI-018<br>UI-021<br>UI-028<br>UI-036<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-067 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| CORE-010 | `ROLE_LEVEL_ONLY` | SYS-LIFECYCLE-01<br>SYS-LIFECYCLE-02<br>SYS-WINS-01<br>SYS-WINS-02 | 13 | UI-017<br>UI-018<br>UI-021<br>UI-028<br>UI-036<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-067 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| CORE-011 | `ROLE_LEVEL_ONLY` | SYS-LIFECYCLE-01<br>SYS-LIFECYCLE-02<br>SYS-WINS-01<br>SYS-WINS-02 | 13 | UI-017<br>UI-018<br>UI-021<br>UI-028<br>UI-036<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-067 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| CORE-012 | `ROLE_LEVEL_ONLY` | SYS-LIFECYCLE-01<br>SYS-LIFECYCLE-02<br>SYS-WINS-01<br>SYS-WINS-02 | 13 | UI-017<br>UI-018<br>UI-021<br>UI-028<br>UI-036<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-067 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| DAY-001 | `ROLE_LEVEL_ONLY` | SYS-VOTES-01<br>SYS-VOTES-02<br>SYS-VOTES-03<br>SYS-WINS-01<br>SYS-WINS-02 | 12 | UI-003<br>UI-047<br>UI-049<br>UI-050<br>UI-051<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 11 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| DAY-002 | `ENGINE_VERIFIED` | SYS-VOTES-01 | 1 | — | 0 |  |
| DAY-003 | `ENGINE_VERIFIED` | SYS-VOTES-01 | 1 | — | 0 |  |
| DEATH-001 | `ROLE_LEVEL_ONLY` | SYS-EFFECTS-01<br>SYS-EFFECTS-02<br>SYS-WINS-01 | 7 | UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| DEATH-002 | `ROLE_LEVEL_ONLY` | SYS-EFFECTS-01<br>SYS-EFFECTS-02<br>SYS-WINS-01 | 7 | UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| DEATH-003 | `ENGINE_VERIFIED` | SYS-EFFECTS-05 | 1 | — | 0 |  |
| DEATH-004 | `ROLE_LEVEL_ONLY` | SYS-EFFECTS-01<br>SYS-EFFECTS-02<br>SYS-WINS-01 | 7 | UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| EXEC-001 | `ROLE_LEVEL_ONLY` | SYS-VOTES-01<br>SYS-VOTES-02<br>SYS-VOTES-03<br>SYS-WINS-01<br>SYS-WINS-02 | 12 | UI-003<br>UI-047<br>UI-049<br>UI-050<br>UI-051<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 11 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| EXEC-002 | `ROLE_LEVEL_ONLY` | SYS-VOTES-01<br>SYS-VOTES-02<br>SYS-VOTES-03<br>SYS-WINS-01<br>SYS-WINS-02 | 12 | UI-003<br>UI-047<br>UI-049<br>UI-050<br>UI-051<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 11 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| EXEC-003 | `ROLE_LEVEL_ONLY` | SYS-VOTES-01<br>SYS-VOTES-02<br>SYS-VOTES-03<br>SYS-WINS-01<br>SYS-WINS-02 | 12 | UI-003<br>UI-047<br>UI-049<br>UI-050<br>UI-051<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 11 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| EXEC-004 | `ROLE_LEVEL_ONLY` | SYS-VOTES-01<br>SYS-VOTES-02<br>SYS-VOTES-03<br>SYS-WINS-01<br>SYS-WINS-02 | 12 | UI-003<br>UI-047<br>UI-049<br>UI-050<br>UI-051<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 11 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| EXEC-005 | `ROLE_LEVEL_ONLY` | SYS-VOTES-01<br>SYS-VOTES-02<br>SYS-VOTES-03<br>SYS-WINS-01<br>SYS-WINS-02 | 12 | UI-003<br>UI-047<br>UI-049<br>UI-050<br>UI-051<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 11 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| EXEC-006 | `ROLE_LEVEL_ONLY` | SYS-VOTES-01<br>SYS-VOTES-02<br>SYS-VOTES-03<br>SYS-WINS-01<br>SYS-WINS-02 | 12 | UI-003<br>UI-047<br>UI-049<br>UI-050<br>UI-051<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 11 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| EXEC-007 | `ROLE_LEVEL_ONLY` | SYS-VOTES-01<br>SYS-VOTES-02<br>SYS-VOTES-03<br>SYS-WINS-01<br>SYS-WINS-02 | 12 | UI-003<br>UI-047<br>UI-049<br>UI-050<br>UI-051<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 11 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| INFO-001 | `ENGINE_VERIFIED` | SYS-EFFECTS-01 | 2 | UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-074 | 9 |  |
| INFO-002 | `ROLE_LEVEL_ONLY` | SYS-EFFECTS-01<br>SYS-EFFECTS-02<br>SYS-WINS-01 | 7 | UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| INFO-003 | `ROLE_LEVEL_ONLY` | SYS-EFFECTS-01<br>SYS-EFFECTS-02<br>SYS-WINS-01 | 7 | UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| INFO-004 | `ROLE_LEVEL_ONLY` | SYS-EFFECTS-01<br>SYS-EFFECTS-02<br>SYS-WINS-01 | 7 | UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| INFO-005 | `ROLE_LEVEL_ONLY` | SYS-EFFECTS-01<br>SYS-EFFECTS-02<br>SYS-WINS-01 | 7 | UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| INFO-006 | `ROLE_LEVEL_ONLY` | SYS-EFFECTS-01<br>SYS-EFFECTS-02<br>SYS-WINS-01 | 7 | UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| INFO-007 | `ROLE_LEVEL_ONLY` | SYS-EFFECTS-01<br>SYS-EFFECTS-02<br>SYS-WINS-01 | 7 | UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| NIGHT-001 | `ROLE_LEVEL_ONLY` | SYS-NIGHT-01<br>SYS-NIGHT-02<br>SYS-NIGHT-03 | 4 | UI-028<br>UI-029<br>UI-030<br>UI-035<br>UI-046<br>UI-072<br>UI-084 | 11 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| NIGHT-002 | `ROLE_LEVEL_ONLY` | SYS-NIGHT-01<br>SYS-NIGHT-02<br>SYS-NIGHT-03 | 4 | UI-028<br>UI-029<br>UI-030<br>UI-035<br>UI-046<br>UI-072<br>UI-084 | 11 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| NIGHT-003 | `ROLE_LEVEL_ONLY` | SYS-NIGHT-01<br>SYS-NIGHT-02<br>SYS-NIGHT-03 | 4 | UI-028<br>UI-029<br>UI-030<br>UI-035<br>UI-046<br>UI-072<br>UI-084 | 11 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| NIGHT-004 | `ROLE_LEVEL_ONLY` | SYS-NIGHT-01<br>SYS-NIGHT-02<br>SYS-NIGHT-03 | 4 | UI-028<br>UI-029<br>UI-030<br>UI-035<br>UI-046<br>UI-072<br>UI-084 | 11 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| NIGHT-005 | `ROLE_LEVEL_ONLY` | SYS-NIGHT-01<br>SYS-NIGHT-02<br>SYS-NIGHT-03 | 4 | UI-028<br>UI-029<br>UI-030<br>UI-035<br>UI-046<br>UI-072<br>UI-084 | 11 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| NIGHT-006 | `ROLE_LEVEL_ONLY` | SYS-NIGHT-01<br>SYS-NIGHT-02<br>SYS-NIGHT-03 | 4 | UI-028<br>UI-029<br>UI-030<br>UI-035<br>UI-046<br>UI-072<br>UI-084 | 11 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-ARTIST-001 | `ENGINE_PARTIAL` | SNV-ARTIST-01 | 3 | UI-054 | 4 | Part of the rule is left to the Storyteller (host-choice); the engine offers the legal options. |
| ROLE-ARTIST-002 | `ROLE_LEVEL_ONLY` | SNV-ARTIST-01 | 3 | UI-054 | 4 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-ARTIST-003 | `ROLE_LEVEL_ONLY` | SNV-ARTIST-01 | 3 | UI-054 | 4 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-ARTIST-004 | `ROLE_LEVEL_ONLY` | SNV-ARTIST-01 | 3 | UI-054 | 4 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-ARTIST-005 | `ROLE_LEVEL_ONLY` | SNV-ARTIST-01 | 3 | UI-054 | 4 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-ARTIST-006 | `ENGINE_PARTIAL` | SNV-ARTIST-01 | 3 | UI-054 | 4 | Part of the rule is left to the Storyteller (host-choice); the engine offers the legal options. |
| ROLE-ASSASSIN-001 | `ENGINE_VERIFIED` | BMR-ASSASSIN-01<br>BMR-ASSASSIN-02 | 10 | — | 0 |  |
| ROLE-ASSASSIN-002 | `ENGINE_VERIFIED` | BMR-ASSASSIN-01 | 4 | — | 0 |  |
| ROLE-ASSASSIN-003 | `ENGINE_VERIFIED` | BMR-ASSASSIN-02 | 6 | — | 0 |  |
| ROLE-ASSASSIN-004 | `ENGINE_VERIFIED` | BMR-ASSASSIN-01 | 4 | — | 0 |  |
| ROLE-ASSASSIN-005 | `ENGINE_VERIFIED` | BMR-ASSASSIN-02 | 6 | — | 0 |  |
| ROLE-BARBER-001 | `ENGINE_VERIFIED` | SNV-BARBER-01 | 4 | UI-045 | 2 |  |
| ROLE-BARBER-002 | `ROLE_LEVEL_ONLY` | SNV-BARBER-01<br>SNV-BARBER-02<br>SNV-BARBER-03<br>SNV-BARBER-04 | 7 | UI-045 | 2 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-BARBER-003 | `ENGINE_VERIFIED` | SNV-BARBER-01 | 4 | UI-045 | 2 |  |
| ROLE-BARBER-004 | `ROLE_LEVEL_ONLY` | SNV-BARBER-01<br>SNV-BARBER-02<br>SNV-BARBER-03<br>SNV-BARBER-04 | 7 | UI-045 | 2 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-BARBER-005 | `ENGINE_VERIFIED` | SNV-BARBER-01 | 4 | UI-045 | 2 |  |
| ROLE-BARBER-006 | `ENGINE_VERIFIED` | SNV-BARBER-01 | 4 | UI-045 | 2 |  |
| ROLE-BARBER-007 | `ENGINE_VERIFIED` | SNV-BARBER-01 | 4 | UI-045 | 2 |  |
| ROLE-BARBER-008 | `ENGINE_VERIFIED` | SNV-BARBER-02 | 1 | — | 0 |  |
| ROLE-BARON-001 | `ENGINE_VERIFIED` | TB-BARON-01 | 1 | — | 0 |  |
| ROLE-BARON-002 | `ENGINE_VERIFIED` | TB-BARON-01 | 1 | — | 0 |  |
| ROLE-BARON-003 | `ROLE_LEVEL_ONLY` | TB-BARON-01 | 1 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-BARON-004 | `ROLE_LEVEL_ONLY` | TB-BARON-01 | 1 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-BARON-005 | `ENGINE_VERIFIED` | TB-BARON-01 | 1 | — | 0 |  |
| ROLE-BUTLER-001 | `ENGINE_VERIFIED` | TB-BUTLER-01 | 10 | UI-031 | 6 |  |
| ROLE-BUTLER-002 | `ENGINE_VERIFIED` | TB-BUTLER-01 | 10 | UI-031 | 6 |  |
| ROLE-BUTLER-003 | `ENGINE_VERIFIED` | TB-BUTLER-01 | 10 | UI-031 | 6 |  |
| ROLE-BUTLER-004 | `ROLE_LEVEL_ONLY` | TB-BUTLER-01 | 10 | UI-031 | 6 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-BUTLER-005 | `ENGINE_VERIFIED` | TB-BUTLER-01 | 10 | UI-031 | 6 |  |
| ROLE-BUTLER-006 | `ROLE_LEVEL_ONLY` | TB-BUTLER-01 | 10 | UI-031 | 6 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-BUTLER-007 | `ROLE_LEVEL_ONLY` | TB-BUTLER-01 | 10 | UI-031 | 6 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-CERENOVUS-001 | `ENGINE_PARTIAL` | SNV-CERENOVUS-01 | 18 | UI-045<br>UI-059 | 6 | Part of the rule is left to the Storyteller (host-choice); the engine offers the legal options. |
| ROLE-CERENOVUS-002 | `ROLE_LEVEL_ONLY` | SNV-CERENOVUS-01 | 18 | UI-045<br>UI-059 | 6 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-CERENOVUS-003 | `ROLE_LEVEL_ONLY` | SNV-CERENOVUS-01 | 18 | UI-045<br>UI-059 | 6 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-CERENOVUS-004 | `ROLE_LEVEL_ONLY` | SNV-CERENOVUS-01 | 18 | UI-045<br>UI-059 | 6 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-CERENOVUS-005 | `ROLE_LEVEL_ONLY` | SNV-CERENOVUS-01 | 18 | UI-045<br>UI-059 | 6 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-CERENOVUS-006 | `ROLE_LEVEL_ONLY` | SNV-CERENOVUS-01 | 18 | UI-045<br>UI-059 | 6 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-CERENOVUS-007 | `ROLE_LEVEL_ONLY` | SNV-CERENOVUS-01 | 18 | UI-045<br>UI-059 | 6 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-CHAMBERMAID-001 | `ENGINE_VERIFIED` | BMR-CHAMBERMAID-01<br>BMR-CHAMBERMAID-03 | 4 | — | 0 |  |
| ROLE-CHAMBERMAID-002 | `ENGINE_VERIFIED` | BMR-CHAMBERMAID-03 | 2 | — | 0 |  |
| ROLE-CHAMBERMAID-003 | `ENGINE_VERIFIED` | BMR-CHAMBERMAID-01 | 2 | — | 0 |  |
| ROLE-CHAMBERMAID-004 | `ENGINE_VERIFIED` | BMR-CHAMBERMAID-01 | 2 | — | 0 |  |
| ROLE-CHAMBERMAID-005 | `ROLE_LEVEL_ONLY` | BMR-CHAMBERMAID-01<br>BMR-CHAMBERMAID-02<br>BMR-CHAMBERMAID-03<br>BMR-CHAMBERMAID-04<br>BMR-CHAMBERMAID-05 | 7 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-CHAMBERMAID-006 | `ENGINE_VERIFIED` | BMR-CHAMBERMAID-02 | 1 | — | 0 |  |
| ROLE-CHEF-001 | `ENGINE_VERIFIED` | TB-CHEF-01 | 10 | — | 0 |  |
| ROLE-CHEF-002 | `ENGINE_VERIFIED` | TB-CHEF-01 | 10 | — | 0 |  |
| ROLE-CHEF-003 | `ENGINE_VERIFIED` | TB-CHEF-01 | 10 | — | 0 |  |
| ROLE-CHEF-004 | `ROLE_LEVEL_ONLY` | TB-CHEF-01<br>TB-CHEF-02 | 22 | UI-023<br>UI-038 | 7 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-CHEF-005 | `ENGINE_VERIFIED` | TB-CHEF-01 | 10 | — | 0 |  |
| ROLE-CLOCKMAKER-001 | `ENGINE_VERIFIED` | SNV-CLOCKMAKER-01 | 5 | — | 0 |  |
| ROLE-CLOCKMAKER-002 | `ENGINE_VERIFIED` | SNV-CLOCKMAKER-01 | 5 | — | 0 |  |
| ROLE-CLOCKMAKER-003 | `ENGINE_VERIFIED` | SNV-CLOCKMAKER-01 | 5 | — | 0 |  |
| ROLE-CLOCKMAKER-004 | `ROLE_LEVEL_ONLY` | SNV-CLOCKMAKER-01<br>SNV-CLOCKMAKER-02<br>SNV-CLOCKMAKER-03 | 7 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-CLOCKMAKER-005 | `ENGINE_VERIFIED` | SNV-CLOCKMAKER-01 | 5 | — | 0 |  |
| ROLE-COURTIER-001 | `ENGINE_VERIFIED` | BMR-COURTIER-01 | 1 | — | 0 |  |
| ROLE-COURTIER-002 | `ROLE_LEVEL_ONLY` | BMR-COURTIER-01 | 1 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-COURTIER-003 | `ENGINE_VERIFIED` | BMR-COURTIER-01 | 1 | — | 0 |  |
| ROLE-COURTIER-004 | `ROLE_LEVEL_ONLY` | BMR-COURTIER-01 | 1 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-COURTIER-005 | `ROLE_LEVEL_ONLY` | BMR-COURTIER-01 | 1 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-COURTIER-006 | `ROLE_LEVEL_ONLY` | BMR-COURTIER-01 | 1 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-COURTIER-007 | `ENGINE_VERIFIED` | BMR-COURTIER-01 | 1 | — | 0 |  |
| ROLE-COURTIER-008 | `ROLE_LEVEL_ONLY` | BMR-COURTIER-01 | 1 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-DEVILS-ADVOCATE-001 | `ENGINE_VERIFIED` | BMR-DEVILSADVOCATE-01<br>BMR-DEVILSADVOCATE-02 | 10 | UI-031 | 6 |  |
| ROLE-DEVILS-ADVOCATE-002 | `ENGINE_VERIFIED` | BMR-DEVILSADVOCATE-02 | 4 | UI-031 | 6 |  |
| ROLE-DEVILS-ADVOCATE-003 | `ENGINE_VERIFIED` | BMR-DEVILSADVOCATE-01 | 6 | — | 0 |  |
| ROLE-DEVILS-ADVOCATE-004 | `ROLE_LEVEL_ONLY` | BMR-DEVILSADVOCATE-01<br>BMR-DEVILSADVOCATE-02<br>BMR-DEVILSADVOCATE-03 | 11 | UI-031 | 6 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-DEVILS-ADVOCATE-005 | `ROLE_LEVEL_ONLY` | BMR-DEVILSADVOCATE-01<br>BMR-DEVILSADVOCATE-02<br>BMR-DEVILSADVOCATE-03 | 11 | UI-031 | 6 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-DEVILS-ADVOCATE-006 | `ENGINE_VERIFIED` | BMR-DEVILSADVOCATE-01 | 6 | — | 0 |  |
| ROLE-DREAMER-001 | `ROLE_LEVEL_ONLY` | SNV-DREAMER-01 | 14 | UI-031 | 6 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-DREAMER-002 | `ROLE_LEVEL_ONLY` | SNV-DREAMER-01 | 14 | UI-031 | 6 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-DREAMER-003 | `ENGINE_PARTIAL` | SNV-DREAMER-01 | 14 | UI-031 | 6 | Part of the rule is left to the Storyteller (host-choice); the engine offers the legal options. |
| ROLE-DREAMER-004 | `ROLE_LEVEL_ONLY` | SNV-DREAMER-01 | 14 | UI-031 | 6 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-DREAMER-005 | `ROLE_LEVEL_ONLY` | SNV-DREAMER-01 | 14 | UI-031 | 6 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-DREAMER-006 | `ENGINE_PARTIAL` | SNV-DREAMER-01 | 14 | UI-031 | 6 | Part of the rule is left to the Storyteller (host-choice); the engine offers the legal options. |
| ROLE-DRUNK-001 | `ENGINE_VERIFIED` | TB-DRUNK-01 | 1 | UI-011<br>UI-025 | 5 |  |
| ROLE-DRUNK-002 | `ENGINE_VERIFIED` | TB-DRUNK-01 | 1 | UI-011<br>UI-025 | 5 |  |
| ROLE-DRUNK-003 | `ROLE_LEVEL_ONLY` | TB-DRUNK-01 | 1 | UI-011<br>UI-025 | 5 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-DRUNK-004 | `ENGINE_VERIFIED` | TB-DRUNK-01 | 1 | UI-011<br>UI-025 | 5 |  |
| ROLE-DRUNK-005 | `ROLE_LEVEL_ONLY` | TB-DRUNK-01 | 1 | UI-011<br>UI-025 | 5 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-DRUNK-006 | `ENGINE_VERIFIED` | TB-DRUNK-01 | 1 | UI-011<br>UI-025 | 5 |  |
| ROLE-EMPATH-001 | `ENGINE_VERIFIED` | TB-EMPATH-01 | 7 | — | 0 |  |
| ROLE-EMPATH-002 | `ENGINE_VERIFIED` | TB-EMPATH-01 | 7 | — | 0 |  |
| ROLE-EMPATH-003 | `ENGINE_VERIFIED` | TB-EMPATH-01 | 7 | — | 0 |  |
| ROLE-EMPATH-004 | `ROLE_LEVEL_ONLY` | TB-EMPATH-01<br>TB-EMPATH-02<br>TB-EMPATH-03 | 16 | UI-038 | 3 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-EVIL-TWIN-001 | `ENGINE_VERIFIED` | SNV-EVILTWIN-01 | 12 | UI-014<br>UI-027 | 4 |  |
| ROLE-EVIL-TWIN-002 | `ROLE_LEVEL_ONLY` | SNV-EVILTWIN-01<br>SNV-EVILTWIN-02<br>SNV-EVILTWIN-03<br>SNV-EVILTWIN-04<br>SNV-EVILTWIN-05 | 21 | UI-014<br>UI-027 | 4 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-EVIL-TWIN-003 | `ENGINE_VERIFIED` | SNV-EVILTWIN-01 | 12 | UI-014<br>UI-027 | 4 |  |
| ROLE-EVIL-TWIN-004 | `ENGINE_VERIFIED` | SNV-EVILTWIN-01 | 12 | UI-014<br>UI-027 | 4 |  |
| ROLE-EVIL-TWIN-005 | `ENGINE_VERIFIED` | SNV-EVILTWIN-02 | 2 | — | 0 |  |
| ROLE-EVIL-TWIN-006 | `ROLE_LEVEL_ONLY` | SNV-EVILTWIN-01<br>SNV-EVILTWIN-02<br>SNV-EVILTWIN-03<br>SNV-EVILTWIN-04<br>SNV-EVILTWIN-05 | 21 | UI-014<br>UI-027 | 4 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-EVIL-TWIN-007 | `ROLE_LEVEL_ONLY` | SNV-EVILTWIN-01<br>SNV-EVILTWIN-02<br>SNV-EVILTWIN-03<br>SNV-EVILTWIN-04<br>SNV-EVILTWIN-05 | 21 | UI-014<br>UI-027 | 4 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-EVIL-TWIN-008 | `ROLE_LEVEL_ONLY` | SNV-EVILTWIN-01<br>SNV-EVILTWIN-02<br>SNV-EVILTWIN-03<br>SNV-EVILTWIN-04<br>SNV-EVILTWIN-05 | 21 | UI-014<br>UI-027 | 4 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-EXORCIST-001 | `ENGINE_VERIFIED` | BMR-EXORCIST-01 | 7 | — | 0 |  |
| ROLE-EXORCIST-002 | `ENGINE_VERIFIED` | BMR-EXORCIST-02 | 4 | UI-031 | 6 |  |
| ROLE-EXORCIST-003 | `ENGINE_VERIFIED` | BMR-EXORCIST-01 | 7 | — | 0 |  |
| ROLE-EXORCIST-004 | `ENGINE_VERIFIED` | BMR-EXORCIST-01 | 7 | — | 0 |  |
| ROLE-EXORCIST-005 | `ROLE_LEVEL_ONLY` | BMR-EXORCIST-01<br>BMR-EXORCIST-02 | 11 | UI-031 | 6 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-EXORCIST-006 | `ROLE_LEVEL_ONLY` | BMR-EXORCIST-01<br>BMR-EXORCIST-02 | 11 | UI-031 | 6 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-FANG-GU-001 | `ENGINE_VERIFIED` | SNV-FANGGU-01 | 6 | — | 0 |  |
| ROLE-FANG-GU-002 | `ENGINE_VERIFIED` | SNV-FANGGU-01 | 6 | — | 0 |  |
| ROLE-FANG-GU-003 | `ENGINE_VERIFIED` | SNV-FANGGU-01 | 6 | — | 0 |  |
| ROLE-FANG-GU-004 | `ENGINE_VERIFIED` | SNV-FANGGU-02 | 1 | — | 0 |  |
| ROLE-FANG-GU-005 | `ROLE_LEVEL_ONLY` | SNV-FANGGU-01<br>SNV-FANGGU-02<br>SNV-FANGGU-03<br>SNV-FANGGU-04 | 10 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-FANG-GU-006 | `ENGINE_VERIFIED` | SNV-FANGGU-03 | 1 | — | 0 |  |
| ROLE-FANG-GU-007 | `ENGINE_VERIFIED` | SNV-FANGGU-02 | 1 | — | 0 |  |
| ROLE-FLOWERGIRL-001 | `ENGINE_VERIFIED` | SNV-FLOWERGIRL-01 | 4 | — | 0 |  |
| ROLE-FLOWERGIRL-002 | `ENGINE_VERIFIED` | SNV-FLOWERGIRL-01 | 4 | — | 0 |  |
| ROLE-FLOWERGIRL-003 | `ROLE_LEVEL_ONLY` | SNV-FLOWERGIRL-01<br>SNV-FLOWERGIRL-02 | 6 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-FLOWERGIRL-004 | `ENGINE_VERIFIED` | SNV-FLOWERGIRL-02 | 2 | — | 0 |  |
| ROLE-FLOWERGIRL-005 | `ROLE_LEVEL_ONLY` | SNV-FLOWERGIRL-01<br>SNV-FLOWERGIRL-02 | 6 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-FLOWERGIRL-006 | `ROLE_LEVEL_ONLY` | SNV-FLOWERGIRL-01<br>SNV-FLOWERGIRL-02 | 6 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-FOOL-001 | `ENGINE_VERIFIED` | BMR-FOOL-01 | 2 | — | 0 |  |
| ROLE-FOOL-002 | `ROLE_LEVEL_ONLY` | BMR-FOOL-01 | 2 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-FOOL-003 | `ENGINE_VERIFIED` | BMR-FOOL-01 | 2 | — | 0 |  |
| ROLE-FOOL-004 | `ENGINE_VERIFIED` | BMR-FOOL-01 | 2 | — | 0 |  |
| ROLE-FOOL-005 | `ROLE_LEVEL_ONLY` | BMR-FOOL-01 | 2 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-FOOL-006 | `ROLE_LEVEL_ONLY` | BMR-FOOL-01 | 2 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-FORTUNE-TELLER-001 | `ENGINE_VERIFIED` | TB-FORTUNETELLER-01 | 14 | UI-022<br>UI-038 | 5 |  |
| ROLE-FORTUNE-TELLER-002 | `ENGINE_VERIFIED` | TB-FORTUNETELLER-01 | 14 | UI-022<br>UI-038 | 5 |  |
| ROLE-FORTUNE-TELLER-003 | `ROLE_LEVEL_ONLY` | TB-FORTUNETELLER-01 | 14 | UI-022<br>UI-038 | 5 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-FORTUNE-TELLER-004 | `ENGINE_VERIFIED` | TB-FORTUNETELLER-01 | 14 | UI-022<br>UI-038 | 5 |  |
| ROLE-FORTUNE-TELLER-005 | `ROLE_LEVEL_ONLY` | TB-FORTUNETELLER-01 | 14 | UI-022<br>UI-038 | 5 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-FORTUNE-TELLER-006 | `ROLE_LEVEL_ONLY` | TB-FORTUNETELLER-01 | 14 | UI-022<br>UI-038 | 5 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-FORTUNE-TELLER-007 | `ROLE_LEVEL_ONLY` | TB-FORTUNETELLER-01 | 14 | UI-022<br>UI-038 | 5 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-GAMBLER-001 | `ENGINE_VERIFIED` | BMR-GAMBLER-01 | 5 | — | 0 |  |
| ROLE-GAMBLER-002 | `ENGINE_VERIFIED` | BMR-GAMBLER-01 | 5 | — | 0 |  |
| ROLE-GAMBLER-003 | `ENGINE_VERIFIED` | BMR-GAMBLER-01 | 5 | — | 0 |  |
| ROLE-GAMBLER-004 | `ROLE_LEVEL_ONLY` | BMR-GAMBLER-01<br>BMR-GAMBLER-02 | 6 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-GAMBLER-005 | `ENGINE_VERIFIED` | BMR-GAMBLER-01 | 5 | — | 0 |  |
| ROLE-GAMBLER-006 | `ROLE_LEVEL_ONLY` | BMR-GAMBLER-01<br>BMR-GAMBLER-02 | 6 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-GODFATHER-001 | `ENGINE_VERIFIED` | BMR-GODFATHER-03 | 1 | UI-013<br>UI-027 | 3 |  |
| ROLE-GODFATHER-002 | `ENGINE_VERIFIED` | BMR-GODFATHER-01 | 1 | UI-044 | 2 |  |
| ROLE-GODFATHER-003 | `ENGINE_VERIFIED` | BMR-GODFATHER-02 | 1 | — | 0 |  |
| ROLE-GODFATHER-004 | `ROLE_LEVEL_ONLY` | BMR-GODFATHER-01<br>BMR-GODFATHER-02<br>BMR-GODFATHER-03 | 3 | UI-013<br>UI-027<br>UI-044 | 3 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-GODFATHER-005 | `ROLE_LEVEL_ONLY` | BMR-GODFATHER-01<br>BMR-GODFATHER-02<br>BMR-GODFATHER-03 | 3 | UI-013<br>UI-027<br>UI-044 | 3 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-GODFATHER-006 | `ROLE_LEVEL_ONLY` | BMR-GODFATHER-01<br>BMR-GODFATHER-02<br>BMR-GODFATHER-03 | 3 | UI-013<br>UI-027<br>UI-044 | 3 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-GOON-001 | `ENGINE_VERIFIED` | BMR-GOON-01 | 4 | — | 0 |  |
| ROLE-GOON-002 | `ENGINE_VERIFIED` | BMR-GOON-01 | 4 | — | 0 |  |
| ROLE-GOON-003 | `ENGINE_VERIFIED` | BMR-GOON-01 | 4 | — | 0 |  |
| ROLE-GOON-004 | `ENGINE_VERIFIED` | BMR-GOON-01 | 4 | — | 0 |  |
| ROLE-GOON-005 | `ROLE_LEVEL_ONLY` | BMR-GOON-01 | 4 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-GOON-006 | `ENGINE_VERIFIED` | BMR-GOON-01 | 4 | — | 0 |  |
| ROLE-GOON-007 | `ENGINE_VERIFIED` | BMR-ASSASSIN-01<br>BMR-GOON-01 | 8 | — | 0 |  |
| ROLE-GOSSIP-001 | `ENGINE_VERIFIED` | BMR-GOSSIP-01 | 1 | UI-056 | 2 |  |
| ROLE-GOSSIP-002 | `ROLE_LEVEL_ONLY` | BMR-GOSSIP-01 | 1 | UI-056 | 2 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-GOSSIP-003 | `ENGINE_VERIFIED` | BMR-GOSSIP-01 | 1 | UI-056 | 2 |  |
| ROLE-GOSSIP-004 | `ENGINE_VERIFIED` | BMR-GOSSIP-01 | 1 | UI-056 | 2 |  |
| ROLE-GOSSIP-005 | `ROLE_LEVEL_ONLY` | BMR-GOSSIP-01 | 1 | UI-056 | 2 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-GOSSIP-006 | `ROLE_LEVEL_ONLY` | BMR-GOSSIP-01 | 1 | UI-056 | 2 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-GOSSIP-007 | `ROLE_LEVEL_ONLY` | BMR-GOSSIP-01 | 1 | UI-056 | 2 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-GRANDMOTHER-001 | `ROLE_LEVEL_ONLY` | BMR-GRANDMOTHER-01<br>BMR-GRANDMOTHER-02 | 2 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-GRANDMOTHER-002 | `ROLE_LEVEL_ONLY` | BMR-GRANDMOTHER-01<br>BMR-GRANDMOTHER-02 | 2 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-GRANDMOTHER-003 | `ENGINE_VERIFIED` | BMR-GRANDMOTHER-01 | 1 | — | 0 |  |
| ROLE-GRANDMOTHER-004 | `ROLE_LEVEL_ONLY` | BMR-GRANDMOTHER-01<br>BMR-GRANDMOTHER-02 | 2 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-GRANDMOTHER-005 | `ROLE_LEVEL_ONLY` | BMR-GRANDMOTHER-01<br>BMR-GRANDMOTHER-02 | 2 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-GRANDMOTHER-006 | `ENGINE_VERIFIED` | BMR-GRANDMOTHER-02 | 1 | — | 0 |  |
| ROLE-IMP-001 | `ENGINE_VERIFIED` | TB-IMP-01 | 22 | UI-037 | 4 |  |
| ROLE-IMP-002 | `ENGINE_VERIFIED` | TB-IMP-01 | 22 | UI-037 | 4 |  |
| ROLE-IMP-003 | `ENGINE_VERIFIED` | TB-IMP-01 | 22 | UI-037 | 4 |  |
| ROLE-IMP-004 | `ROLE_LEVEL_ONLY` | TB-IMP-01 | 22 | UI-037 | 4 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-IMP-005 | `ENGINE_VERIFIED` | TB-IMP-01 | 22 | UI-037 | 4 |  |
| ROLE-IMP-006 | `ROLE_LEVEL_ONLY` | TB-IMP-01 | 22 | UI-037 | 4 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-IMP-007 | `ROLE_LEVEL_ONLY` | TB-IMP-01 | 22 | UI-037 | 4 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-INNKEEPER-001 | `ENGINE_VERIFIED` | BMR-INNKEEPER-01 | 7 | UI-044 | 2 |  |
| ROLE-INNKEEPER-002 | `ENGINE_VERIFIED` | BMR-INNKEEPER-01 | 7 | UI-044 | 2 |  |
| ROLE-INNKEEPER-003 | `ENGINE_VERIFIED` | BMR-INNKEEPER-01 | 7 | UI-044 | 2 |  |
| ROLE-INNKEEPER-004 | `ENGINE_VERIFIED` | BMR-INNKEEPER-01 | 7 | UI-044 | 2 |  |
| ROLE-INNKEEPER-005 | `ROLE_LEVEL_ONLY` | BMR-INNKEEPER-01 | 7 | UI-044 | 2 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-INNKEEPER-006 | `ENGINE_VERIFIED` | BMR-INNKEEPER-01 | 7 | UI-044 | 2 |  |
| ROLE-INNKEEPER-007 | `ROLE_LEVEL_ONLY` | BMR-INNKEEPER-01 | 7 | UI-044 | 2 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-INNKEEPER-008 | `ENGINE_VERIFIED` | BMR-INNKEEPER-01 | 7 | UI-044 | 2 |  |
| ROLE-INVESTIGATOR-001 | `ENGINE_VERIFIED` | TB-INVESTIGATOR-01 | 8 | UI-023<br>UI-025 | 7 |  |
| ROLE-INVESTIGATOR-002 | `ENGINE_VERIFIED` | TB-INVESTIGATOR-01 | 8 | UI-023<br>UI-025 | 7 |  |
| ROLE-INVESTIGATOR-003 | `ENGINE_VERIFIED` | TB-INVESTIGATOR-01 | 8 | UI-023<br>UI-025 | 7 |  |
| ROLE-INVESTIGATOR-004 | `ROLE_LEVEL_ONLY` | TB-INVESTIGATOR-01 | 8 | UI-023<br>UI-025 | 7 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-INVESTIGATOR-005 | `ROLE_LEVEL_ONLY` | TB-INVESTIGATOR-01 | 8 | UI-023<br>UI-025 | 7 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-JUGGLER-001 | `ENGINE_VERIFIED` | SNV-JUGGLER-01 | 3 | UI-057 | 3 |  |
| ROLE-JUGGLER-002 | `ROLE_LEVEL_ONLY` | SNV-JUGGLER-01<br>SNV-JUGGLER-02 | 4 | UI-057 | 3 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-JUGGLER-003 | `ENGINE_VERIFIED` | SNV-JUGGLER-01 | 3 | UI-057 | 3 |  |
| ROLE-JUGGLER-004 | `ENGINE_VERIFIED` | SNV-JUGGLER-01 | 3 | UI-057 | 3 |  |
| ROLE-JUGGLER-005 | `ROLE_LEVEL_ONLY` | SNV-JUGGLER-01<br>SNV-JUGGLER-02 | 4 | UI-057 | 3 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-JUGGLER-006 | `ROLE_LEVEL_ONLY` | SNV-JUGGLER-01<br>SNV-JUGGLER-02 | 4 | UI-057 | 3 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-KLUTZ-001 | `ROLE_LEVEL_ONLY` | SNV-KLUTZ-01<br>SNV-KLUTZ-02 | 4 | UI-045 | 2 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-KLUTZ-002 | `ROLE_LEVEL_ONLY` | SNV-KLUTZ-01<br>SNV-KLUTZ-02 | 4 | UI-045 | 2 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-KLUTZ-003 | `ENGINE_VERIFIED` | SNV-KLUTZ-01 | 3 | UI-045 | 2 |  |
| ROLE-KLUTZ-004 | `ENGINE_VERIFIED` | SNV-KLUTZ-01 | 3 | UI-045 | 2 |  |
| ROLE-KLUTZ-005 | `ENGINE_VERIFIED` | SNV-KLUTZ-01 | 3 | UI-045 | 2 |  |
| ROLE-KLUTZ-006 | `ROLE_LEVEL_ONLY` | SNV-KLUTZ-01<br>SNV-KLUTZ-02 | 4 | UI-045 | 2 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-LIBRARIAN-001 | `ENGINE_VERIFIED` | TB-LIBRARIAN-01 | 12 | UI-023<br>UI-024<br>UI-025 | 8 |  |
| ROLE-LIBRARIAN-002 | `ENGINE_VERIFIED` | TB-LIBRARIAN-01 | 12 | UI-023<br>UI-024<br>UI-025 | 8 |  |
| ROLE-LIBRARIAN-003 | `ENGINE_VERIFIED` | TB-LIBRARIAN-01 | 12 | UI-023<br>UI-024<br>UI-025 | 8 |  |
| ROLE-LIBRARIAN-004 | `ENGINE_VERIFIED` | TB-LIBRARIAN-01 | 12 | UI-023<br>UI-024<br>UI-025 | 8 |  |
| ROLE-LIBRARIAN-005 | `ROLE_LEVEL_ONLY` | TB-LIBRARIAN-01 | 12 | UI-023<br>UI-024<br>UI-025 | 8 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-LIBRARIAN-006 | `ROLE_LEVEL_ONLY` | TB-LIBRARIAN-01 | 12 | UI-023<br>UI-024<br>UI-025 | 8 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-LUNATIC-001 | `ROLE_LEVEL_ONLY` | BMR-LUNATIC-01 | 3 | UI-012<br>UI-043 | 4 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-LUNATIC-002 | `ENGINE_VERIFIED` | BMR-LUNATIC-01 | 3 | UI-012<br>UI-043 | 4 |  |
| ROLE-LUNATIC-003 | `ENGINE_VERIFIED` | BMR-LUNATIC-01 | 3 | UI-012<br>UI-043 | 4 |  |
| ROLE-LUNATIC-004 | `ENGINE_VERIFIED` | BMR-LUNATIC-01 | 3 | UI-012<br>UI-043 | 4 |  |
| ROLE-LUNATIC-005 | `ENGINE_VERIFIED` | BMR-LUNATIC-01 | 3 | UI-012<br>UI-043 | 4 |  |
| ROLE-LUNATIC-006 | `ROLE_LEVEL_ONLY` | BMR-LUNATIC-01 | 3 | UI-012<br>UI-043 | 4 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-MASTERMIND-001 | `ENGINE_VERIFIED` | BMR-MASTERMIND-01 | 1 | — | 0 |  |
| ROLE-MASTERMIND-002 | `ROLE_LEVEL_ONLY` | BMR-MASTERMIND-01 | 1 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-MASTERMIND-003 | `ENGINE_VERIFIED` | BMR-MASTERMIND-01 | 1 | — | 0 |  |
| ROLE-MASTERMIND-004 | `ENGINE_VERIFIED` | BMR-MASTERMIND-01 | 1 | — | 0 |  |
| ROLE-MASTERMIND-005 | `ENGINE_VERIFIED` | BMR-MASTERMIND-01 | 1 | — | 0 |  |
| ROLE-MASTERMIND-006 | `ROLE_LEVEL_ONLY` | BMR-MASTERMIND-01 | 1 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-MASTERMIND-007 | `ROLE_LEVEL_ONLY` | BMR-MASTERMIND-01 | 1 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-MATHEMATICIAN-001 | `ENGINE_VERIFIED` | SNV-MATHEMATICIAN-01 | 6 | UI-060 | 2 |  |
| ROLE-MATHEMATICIAN-002 | `ENGINE_VERIFIED` | SNV-MATHEMATICIAN-01 | 6 | UI-060 | 2 |  |
| ROLE-MATHEMATICIAN-003 | `ENGINE_VERIFIED` | SNV-MATHEMATICIAN-04 | 1 | — | 0 |  |
| ROLE-MATHEMATICIAN-004 | `ROLE_LEVEL_ONLY` | SNV-MATHEMATICIAN-01<br>SNV-MATHEMATICIAN-02<br>SNV-MATHEMATICIAN-03<br>SNV-MATHEMATICIAN-04 | 8 | UI-060 | 2 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-MATHEMATICIAN-005 | `ENGINE_VERIFIED` | SNV-MATHEMATICIAN-01 | 6 | UI-060 | 2 |  |
| ROLE-MATHEMATICIAN-006 | `ROLE_LEVEL_ONLY` | SNV-MATHEMATICIAN-01<br>SNV-MATHEMATICIAN-02<br>SNV-MATHEMATICIAN-03<br>SNV-MATHEMATICIAN-04 | 8 | UI-060 | 2 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-MAYOR-001 | `ENGINE_VERIFIED` | TB-MAYOR-01 | 7 | — | 0 |  |
| ROLE-MAYOR-002 | `ENGINE_VERIFIED` | TB-MAYOR-01 | 7 | — | 0 |  |
| ROLE-MAYOR-003 | `ROLE_LEVEL_ONLY` | TB-MAYOR-01 | 7 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-MAYOR-004 | `ROLE_LEVEL_ONLY` | TB-MAYOR-01 | 7 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-MAYOR-005 | `ROLE_LEVEL_ONLY` | TB-MAYOR-01 | 7 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-MAYOR-006 | `ROLE_LEVEL_ONLY` | TB-MAYOR-01 | 7 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-MAYOR-007 | `ROLE_LEVEL_ONLY` | TB-MAYOR-01 | 7 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-MINSTREL-001 | `ENGINE_VERIFIED` | BMR-MINSTREL-01 | 1 | — | 0 |  |
| ROLE-MINSTREL-002 | `ENGINE_VERIFIED` | BMR-MINSTREL-01 | 1 | — | 0 |  |
| ROLE-MINSTREL-003 | `ENGINE_VERIFIED` | BMR-MINSTREL-01 | 1 | — | 0 |  |
| ROLE-MINSTREL-004 | `ROLE_LEVEL_ONLY` | BMR-MINSTREL-01 | 1 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-MINSTREL-005 | `ROLE_LEVEL_ONLY` | BMR-MINSTREL-01 | 1 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-MINSTREL-006 | `ROLE_LEVEL_ONLY` | BMR-MINSTREL-01 | 1 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-MINSTREL-007 | `ROLE_LEVEL_ONLY` | BMR-MINSTREL-01 | 1 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-MONK-001 | `ENGINE_VERIFIED` | TB-MONK-01 | 8 | UI-031 | 6 |  |
| ROLE-MONK-002 | `ENGINE_VERIFIED` | TB-MONK-01 | 8 | UI-031 | 6 |  |
| ROLE-MONK-003 | `ENGINE_VERIFIED` | TB-MONK-01 | 8 | UI-031 | 6 |  |
| ROLE-MONK-004 | `ROLE_LEVEL_ONLY` | TB-MONK-01 | 8 | UI-031 | 6 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-MONK-005 | `ROLE_LEVEL_ONLY` | TB-MONK-01 | 8 | UI-031 | 6 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-MONK-006 | `ROLE_LEVEL_ONLY` | TB-MONK-01 | 8 | UI-031 | 6 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-MOONCHILD-001 | `ROLE_LEVEL_ONLY` | BMR-MOONCHILD-01<br>BMR-MOONCHILD-02<br>BMR-MOONCHILD-03 | 8 | UI-058 | 2 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-MOONCHILD-002 | `ENGINE_VERIFIED` | BMR-MOONCHILD-01 | 6 | UI-058 | 2 |  |
| ROLE-MOONCHILD-003 | `ENGINE_VERIFIED` | BMR-MOONCHILD-02 | 1 | — | 0 |  |
| ROLE-MOONCHILD-004 | `ROLE_LEVEL_ONLY` | BMR-MOONCHILD-01<br>BMR-MOONCHILD-02<br>BMR-MOONCHILD-03 | 8 | UI-058 | 2 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-MOONCHILD-005 | `ENGINE_VERIFIED` | BMR-MOONCHILD-01 | 6 | UI-058 | 2 |  |
| ROLE-MOONCHILD-006 | `ENGINE_VERIFIED` | BMR-MOONCHILD-01 | 6 | UI-058 | 2 |  |
| ROLE-MOONCHILD-007 | `ENGINE_VERIFIED` | BMR-MOONCHILD-01 | 6 | UI-058 | 2 |  |
| ROLE-MUTANT-001 | `ENGINE_PARTIAL` | SNV-MUTANT-01 | 5 | UI-059 | 5 | Part of the rule is left to the Storyteller (host-choice); the engine offers the legal options. |
| ROLE-MUTANT-002 | `ENGINE_PARTIAL` | SNV-MUTANT-01 | 5 | UI-059 | 5 | Part of the rule is left to the Storyteller (host-choice); the engine offers the legal options. |
| ROLE-MUTANT-003 | `ROLE_LEVEL_ONLY` | SNV-MUTANT-01 | 5 | UI-059 | 5 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-MUTANT-004 | `ROLE_LEVEL_ONLY` | SNV-MUTANT-01 | 5 | UI-059 | 5 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-MUTANT-005 | `ROLE_LEVEL_ONLY` | SNV-MUTANT-01 | 5 | UI-059 | 5 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-MUTANT-006 | `ROLE_LEVEL_ONLY` | SNV-MUTANT-01 | 5 | UI-059 | 5 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-NO-DASHII-001 | `ENGINE_VERIFIED` | SNV-NODASHII-01 | 4 | — | 0 |  |
| ROLE-NO-DASHII-002 | `ENGINE_VERIFIED` | SNV-NODASHII-01 | 4 | — | 0 |  |
| ROLE-NO-DASHII-003 | `ROLE_LEVEL_ONLY` | SNV-NODASHII-01<br>SNV-NODASHII-02 | 5 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-NO-DASHII-004 | `ENGINE_VERIFIED` | SNV-NODASHII-02 | 1 | — | 0 |  |
| ROLE-NO-DASHII-005 | `ROLE_LEVEL_ONLY` | SNV-NODASHII-01<br>SNV-NODASHII-02 | 5 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-ORACLE-001 | `ENGINE_VERIFIED` | SNV-ORACLE-01 | 4 | — | 0 |  |
| ROLE-ORACLE-002 | `ENGINE_VERIFIED` | SNV-ORACLE-01 | 4 | — | 0 |  |
| ROLE-ORACLE-003 | `ENGINE_VERIFIED` | SNV-ORACLE-01 | 4 | — | 0 |  |
| ROLE-ORACLE-004 | `ROLE_LEVEL_ONLY` | SNV-ORACLE-01 | 4 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-ORACLE-005 | `ENGINE_VERIFIED` | SNV-ORACLE-01 | 4 | — | 0 |  |
| ROLE-PACIFIST-001 | `ROLE_LEVEL_ONLY` | BMR-PACIFIST-01 | 2 | UI-048<br>UI-049 | 5 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-PACIFIST-002 | `ROLE_LEVEL_ONLY` | BMR-PACIFIST-01 | 2 | UI-048<br>UI-049 | 5 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-PACIFIST-003 | `ROLE_LEVEL_ONLY` | BMR-PACIFIST-01 | 2 | UI-048<br>UI-049 | 5 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-PACIFIST-004 | `ROLE_LEVEL_ONLY` | BMR-PACIFIST-01 | 2 | UI-048<br>UI-049 | 5 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-PACIFIST-005 | `ROLE_LEVEL_ONLY` | BMR-PACIFIST-01 | 2 | UI-048<br>UI-049 | 5 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-PHILOSOPHER-001 | `ENGINE_VERIFIED` | SNV-PHILOSOPHER-01 | 5 | — | 0 |  |
| ROLE-PHILOSOPHER-002 | `ENGINE_VERIFIED` | SNV-PHILOSOPHER-01 | 5 | — | 0 |  |
| ROLE-PHILOSOPHER-003 | `ENGINE_VERIFIED` | SNV-PHILOSOPHER-01 | 5 | — | 0 |  |
| ROLE-PHILOSOPHER-004 | `ROLE_LEVEL_ONLY` | SNV-PHILOSOPHER-01<br>SNV-PHILOSOPHER-02 | 8 | UI-053<br>UI-057<br>UI-061 | 3 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-PHILOSOPHER-005 | `ENGINE_VERIFIED` | SNV-PHILOSOPHER-01 | 5 | — | 0 |  |
| ROLE-PHILOSOPHER-006 | `ROLE_LEVEL_ONLY` | SNV-PHILOSOPHER-01<br>SNV-PHILOSOPHER-02 | 8 | UI-053<br>UI-057<br>UI-061 | 3 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-PHILOSOPHER-007 | `ENGINE_VERIFIED` | SNV-PHILOSOPHER-02 | 3 | UI-053<br>UI-057<br>UI-061 | 3 |  |
| ROLE-PIT-HAG-001 | `ENGINE_VERIFIED` | SNV-PITHAG-01 | 10 | — | 0 |  |
| ROLE-PIT-HAG-002 | `ENGINE_VERIFIED` | SNV-PITHAG-01 | 10 | — | 0 |  |
| ROLE-PIT-HAG-003 | `ENGINE_VERIFIED` | SNV-PITHAG-01 | 10 | — | 0 |  |
| ROLE-PIT-HAG-004 | `ROLE_LEVEL_ONLY` | SNV-PITHAG-01 | 10 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-PIT-HAG-005 | `ENGINE_VERIFIED` | SNV-PITHAG-01 | 10 | — | 0 |  |
| ROLE-PIT-HAG-006 | `ENGINE_VERIFIED` | SNV-PITHAG-01 | 10 | — | 0 |  |
| ROLE-PIT-HAG-007 | `ROLE_LEVEL_ONLY` | SNV-PITHAG-01 | 10 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-PO-001 | `ENGINE_VERIFIED` | BMR-PO-01 | 6 | UI-035 | 3 |  |
| ROLE-PO-002 | `ENGINE_VERIFIED` | BMR-PO-01 | 6 | UI-035 | 3 |  |
| ROLE-PO-003 | `ENGINE_VERIFIED` | BMR-PO-01 | 6 | UI-035 | 3 |  |
| ROLE-PO-004 | `ENGINE_VERIFIED` | BMR-PO-01 | 6 | UI-035 | 3 |  |
| ROLE-PO-005 | `ENGINE_VERIFIED` | BMR-PO-01 | 6 | UI-035 | 3 |  |
| ROLE-PO-006 | `ROLE_LEVEL_ONLY` | BMR-PO-01 | 6 | UI-035 | 3 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-PO-007 | `ENGINE_VERIFIED` | BMR-PO-01 | 6 | UI-035 | 3 |  |
| ROLE-POISONER-001 | `ENGINE_VERIFIED` | TB-POISONER-01 | 7 | — | 0 |  |
| ROLE-POISONER-002 | `ROLE_LEVEL_ONLY` | TB-POISONER-01 | 7 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-POISONER-003 | `ROLE_LEVEL_ONLY` | TB-POISONER-01 | 7 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-POISONER-004 | `ROLE_LEVEL_ONLY` | TB-POISONER-01 | 7 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-POISONER-005 | `ENGINE_VERIFIED` | TB-POISONER-01 | 7 | — | 0 |  |
| ROLE-POISONER-006 | `ROLE_LEVEL_ONLY` | TB-POISONER-01 | 7 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-PROFESSOR-001 | `ENGINE_VERIFIED` | BMR-PROFESSOR-01<br>BMR-PROFESSOR-03 | 5 | UI-031<br>UI-044 | 6 |  |
| ROLE-PROFESSOR-002 | `ENGINE_VERIFIED` | BMR-PROFESSOR-02 | 1 | — | 0 |  |
| ROLE-PROFESSOR-003 | `ENGINE_VERIFIED` | BMR-PROFESSOR-01 | 4 | UI-031<br>UI-044 | 6 |  |
| ROLE-PROFESSOR-004 | `ROLE_LEVEL_ONLY` | BMR-PROFESSOR-01<br>BMR-PROFESSOR-02<br>BMR-PROFESSOR-03 | 6 | UI-031<br>UI-044 | 6 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-PROFESSOR-005 | `ENGINE_VERIFIED` | BMR-PROFESSOR-03 | 1 | — | 0 |  |
| ROLE-PROFESSOR-006 | `ENGINE_VERIFIED` | BMR-PROFESSOR-03 | 1 | — | 0 |  |
| ROLE-PUKKA-001 | `ENGINE_VERIFIED` | BMR-PUKKA-01 | 2 | — | 0 |  |
| ROLE-PUKKA-002 | `ENGINE_VERIFIED` | BMR-PUKKA-01 | 2 | — | 0 |  |
| ROLE-PUKKA-003 | `ENGINE_VERIFIED` | BMR-PUKKA-01 | 2 | — | 0 |  |
| ROLE-PUKKA-004 | `ENGINE_VERIFIED` | BMR-PUKKA-03<br>BMR-PUKKA-04 | 4 | — | 0 |  |
| ROLE-PUKKA-005 | `ENGINE_VERIFIED` | BMR-PUKKA-04 | 2 | — | 0 |  |
| ROLE-PUKKA-006 | `ENGINE_VERIFIED` | BMR-PUKKA-03 | 2 | — | 0 |  |
| ROLE-PUKKA-007 | `ENGINE_VERIFIED` | BMR-PUKKA-03<br>BMR-PUKKA-07 | 4 | — | 0 |  |
| ROLE-PUKKA-008 | `ROLE_LEVEL_ONLY` | BMR-PUKKA-01<br>BMR-PUKKA-02<br>BMR-PUKKA-03<br>BMR-PUKKA-04<br>BMR-PUKKA-05<br>BMR-PUKKA-06<br>BMR-PUKKA-07 | 10 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-RAVENKEEPER-001 | `ENGINE_VERIFIED` | TB-RAVENKEEPER-01 | 13 | — | 0 |  |
| ROLE-RAVENKEEPER-002 | `ENGINE_VERIFIED` | TB-RAVENKEEPER-01 | 13 | — | 0 |  |
| ROLE-RAVENKEEPER-003 | `ROLE_LEVEL_ONLY` | TB-RAVENKEEPER-01 | 13 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-RAVENKEEPER-004 | `ROLE_LEVEL_ONLY` | TB-RAVENKEEPER-01 | 13 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-RAVENKEEPER-005 | `ROLE_LEVEL_ONLY` | TB-RAVENKEEPER-01 | 13 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-RECLUSE-001 | `ENGINE_VERIFIED` | TB-RECLUSE-01 | 2 | — | 0 |  |
| ROLE-RECLUSE-002 | `ROLE_LEVEL_ONLY` | TB-RECLUSE-01<br>TB-RECLUSE-02 | 3 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-RECLUSE-003 | `ROLE_LEVEL_ONLY` | TB-RECLUSE-01<br>TB-RECLUSE-02 | 3 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-RECLUSE-004 | `ENGINE_VERIFIED` | TB-RECLUSE-02 | 1 | — | 0 |  |
| ROLE-RECLUSE-005 | `ROLE_LEVEL_ONLY` | TB-RECLUSE-01<br>TB-RECLUSE-02 | 3 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-SAGE-001 | `ENGINE_VERIFIED` | SNV-SAGE-01 | 7 | — | 0 |  |
| ROLE-SAGE-002 | `ENGINE_VERIFIED` | SNV-SAGE-01 | 7 | — | 0 |  |
| ROLE-SAGE-003 | `ENGINE_VERIFIED` | SNV-PITHAG-01 | 10 | — | 0 |  |
| ROLE-SAGE-004 | `ROLE_LEVEL_ONLY` | SNV-SAGE-01 | 7 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-SAILOR-001 | `ENGINE_VERIFIED` | BMR-SAILOR-01 | 6 | UI-044 | 2 |  |
| ROLE-SAILOR-002 | `ENGINE_VERIFIED` | BMR-SAILOR-02 | 3 | — | 0 |  |
| ROLE-SAILOR-003 | `ROLE_LEVEL_ONLY` | BMR-SAILOR-01<br>BMR-SAILOR-02 | 8 | UI-044 | 2 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-SAILOR-004 | `ENGINE_VERIFIED` | BMR-SAILOR-01 | 6 | UI-044 | 2 |  |
| ROLE-SAILOR-005 | `ROLE_LEVEL_ONLY` | BMR-SAILOR-01<br>BMR-SAILOR-02 | 8 | UI-044 | 2 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-SAILOR-006 | `ENGINE_VERIFIED` | BMR-SAILOR-01 | 6 | UI-044 | 2 |  |
| ROLE-SAILOR-007 | `ENGINE_VERIFIED` | BMR-SAILOR-02 | 3 | — | 0 |  |
| ROLE-SAINT-001 | `ENGINE_VERIFIED` | TB-SAINT-01 | 2 | — | 0 |  |
| ROLE-SAINT-002 | `ENGINE_VERIFIED` | TB-SAINT-02 | 1 | — | 0 |  |
| ROLE-SAINT-003 | `ENGINE_VERIFIED` | TB-SAINT-01 | 2 | — | 0 |  |
| ROLE-SAINT-004 | `ROLE_LEVEL_ONLY` | TB-SAINT-01<br>TB-SAINT-02 | 3 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-SAINT-005 | `ROLE_LEVEL_ONLY` | TB-SAINT-01<br>TB-SAINT-02 | 3 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-SAVANT-001 | `ROLE_LEVEL_ONLY` | SNV-SAVANT-01<br>SNV-SAVANT-02<br>SNV-SAVANT-03<br>SNV-SAVANT-04 | 5 | UI-055 | 4 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-SAVANT-002 | `ENGINE_PARTIAL` | SNV-SAVANT-02 | 1 | UI-055 | 4 | Part of the rule is left to the Storyteller (host-choice); the engine offers the legal options. |
| ROLE-SAVANT-003 | `ROLE_LEVEL_ONLY` | SNV-SAVANT-01<br>SNV-SAVANT-02<br>SNV-SAVANT-03<br>SNV-SAVANT-04 | 5 | UI-055 | 4 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-SAVANT-004 | `ROLE_LEVEL_ONLY` | SNV-SAVANT-01<br>SNV-SAVANT-02<br>SNV-SAVANT-03<br>SNV-SAVANT-04 | 5 | UI-055 | 4 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-SAVANT-005 | `ROLE_LEVEL_ONLY` | SNV-SAVANT-01<br>SNV-SAVANT-02<br>SNV-SAVANT-03<br>SNV-SAVANT-04 | 5 | UI-055 | 4 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-SAVANT-006 | `ENGINE_PARTIAL` | SNV-SAVANT-03 | 1 | — | 0 | Part of the rule is left to the Storyteller (host-choice); the engine offers the legal options. |
| ROLE-SAVANT-007 | `ROLE_LEVEL_ONLY` | SNV-SAVANT-01<br>SNV-SAVANT-02<br>SNV-SAVANT-03<br>SNV-SAVANT-04 | 5 | UI-055 | 4 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-SCARLET-WOMAN-001 | `ENGINE_VERIFIED` | TB-SCARLETWOMAN-01 | 2 | — | 0 |  |
| ROLE-SCARLET-WOMAN-002 | `ROLE_LEVEL_ONLY` | TB-SCARLETWOMAN-01<br>TB-SCARLETWOMAN-02 | 6 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-SCARLET-WOMAN-003 | `ROLE_LEVEL_ONLY` | TB-SCARLETWOMAN-01<br>TB-SCARLETWOMAN-02 | 6 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-SCARLET-WOMAN-004 | `ENGINE_VERIFIED` | TB-SCARLETWOMAN-01 | 2 | — | 0 |  |
| ROLE-SCARLET-WOMAN-005 | `ENGINE_VERIFIED` | TB-SCARLETWOMAN-01 | 2 | — | 0 |  |
| ROLE-SCARLET-WOMAN-006 | `ENGINE_VERIFIED` | TB-SCARLETWOMAN-02 | 4 | — | 0 |  |
| ROLE-SEAMSTRESS-001 | `ENGINE_VERIFIED` | SNV-SEAMSTRESS-01 | 1 | UI-031 | 6 |  |
| ROLE-SEAMSTRESS-002 | `ENGINE_VERIFIED` | SNV-SEAMSTRESS-01 | 1 | UI-031 | 6 |  |
| ROLE-SEAMSTRESS-003 | `ENGINE_VERIFIED` | SNV-SEAMSTRESS-01 | 1 | UI-031 | 6 |  |
| ROLE-SEAMSTRESS-004 | `ROLE_LEVEL_ONLY` | SNV-SEAMSTRESS-01 | 1 | UI-031 | 6 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-SEAMSTRESS-005 | `ROLE_LEVEL_ONLY` | SNV-SEAMSTRESS-01 | 1 | UI-031 | 6 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-SEAMSTRESS-006 | `ENGINE_VERIFIED` | SNV-SEAMSTRESS-01 | 1 | UI-031 | 6 |  |
| ROLE-SHABALOTH-001 | `ENGINE_VERIFIED` | BMR-SHABALOTH-01 | 9 | UI-037<br>UI-044 | 4 |  |
| ROLE-SHABALOTH-002 | `ENGINE_VERIFIED` | BMR-SHABALOTH-01 | 9 | UI-037<br>UI-044 | 4 |  |
| ROLE-SHABALOTH-003 | `ROLE_LEVEL_ONLY` | BMR-SHABALOTH-01 | 9 | UI-037<br>UI-044 | 4 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-SHABALOTH-004 | `ROLE_LEVEL_ONLY` | BMR-SHABALOTH-01 | 9 | UI-037<br>UI-044 | 4 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-SHABALOTH-005 | `ROLE_LEVEL_ONLY` | BMR-SHABALOTH-01 | 9 | UI-037<br>UI-044 | 4 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-SHABALOTH-006 | `ROLE_LEVEL_ONLY` | BMR-SHABALOTH-01 | 9 | UI-037<br>UI-044 | 4 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-SHABALOTH-007 | `ROLE_LEVEL_ONLY` | BMR-SHABALOTH-01 | 9 | UI-037<br>UI-044 | 4 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-SLAYER-001 | `ENGINE_VERIFIED` | TB-SLAYER-01 | 2 | UI-053 | 3 |  |
| ROLE-SLAYER-002 | `ENGINE_VERIFIED` | TB-SLAYER-01 | 2 | UI-053 | 3 |  |
| ROLE-SLAYER-003 | `ENGINE_VERIFIED` | TB-SLAYER-01 | 2 | UI-053 | 3 |  |
| ROLE-SLAYER-004 | `ENGINE_VERIFIED` | TB-SLAYER-01 | 2 | UI-053 | 3 |  |
| ROLE-SLAYER-005 | `ENGINE_VERIFIED` | TB-SLAYER-01 | 2 | UI-053 | 3 |  |
| ROLE-SLAYER-006 | `ROLE_LEVEL_ONLY` | TB-SLAYER-01 | 2 | UI-053 | 3 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-SNAKE-CHARMER-001 | `ENGINE_VERIFIED` | SNV-SNAKECHARMER-01 | 8 | UI-031 | 6 |  |
| ROLE-SNAKE-CHARMER-002 | `ENGINE_VERIFIED` | SNV-SNAKECHARMER-01 | 8 | UI-031 | 6 |  |
| ROLE-SNAKE-CHARMER-003 | `ENGINE_VERIFIED` | SNV-SNAKECHARMER-01 | 8 | UI-031 | 6 |  |
| ROLE-SNAKE-CHARMER-004 | `ENGINE_VERIFIED` | SNV-SNAKECHARMER-01 | 8 | UI-031 | 6 |  |
| ROLE-SNAKE-CHARMER-005 | `ROLE_LEVEL_ONLY` | SNV-SNAKECHARMER-01 | 8 | UI-031 | 6 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-SNAKE-CHARMER-006 | `ROLE_LEVEL_ONLY` | SNV-SNAKECHARMER-01 | 8 | UI-031 | 6 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-SNAKE-CHARMER-007 | `ENGINE_VERIFIED` | SNV-SNAKECHARMER-01 | 8 | UI-031 | 6 |  |
| ROLE-SOLDIER-001 | `ENGINE_VERIFIED` | TB-SOLDIER-01 | 1 | — | 0 |  |
| ROLE-SOLDIER-002 | `ROLE_LEVEL_ONLY` | TB-SOLDIER-01 | 1 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-SOLDIER-003 | `ROLE_LEVEL_ONLY` | TB-SOLDIER-01 | 1 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-SOLDIER-004 | `ENGINE_VERIFIED` | TB-SOLDIER-01 | 1 | — | 0 |  |
| ROLE-SPY-001 | `ENGINE_VERIFIED` | TB-SPY-01 | 11 | UI-042 | 1 |  |
| ROLE-SPY-002 | `ENGINE_VERIFIED` | TB-SPY-01 | 11 | UI-042 | 1 |  |
| ROLE-SPY-003 | `ROLE_LEVEL_ONLY` | TB-SPY-01 | 11 | UI-042 | 1 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-SPY-004 | `ROLE_LEVEL_ONLY` | TB-SPY-01 | 11 | UI-042 | 1 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-SPY-005 | `ENGINE_VERIFIED` | TB-SPY-01 | 11 | UI-042 | 1 |  |
| ROLE-SPY-006 | `ROLE_LEVEL_ONLY` | TB-SPY-01 | 11 | UI-042 | 1 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-SWEETHEART-001 | `ENGINE_VERIFIED` | SNV-SWEETHEART-01 | 3 | UI-045 | 2 |  |
| ROLE-SWEETHEART-002 | `ENGINE_VERIFIED` | SNV-SWEETHEART-01 | 3 | UI-045 | 2 |  |
| ROLE-SWEETHEART-003 | `ENGINE_VERIFIED` | SNV-SWEETHEART-01 | 3 | UI-045 | 2 |  |
| ROLE-SWEETHEART-004 | `ROLE_LEVEL_ONLY` | SNV-SWEETHEART-01<br>SNV-SWEETHEART-02 | 4 | UI-045 | 2 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-TEA-LADY-001 | `ENGINE_VERIFIED` | BMR-TEALADY-01 | 7 | — | 0 |  |
| ROLE-TEA-LADY-002 | `ROLE_LEVEL_ONLY` | BMR-TEALADY-01 | 7 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-TEA-LADY-003 | `ENGINE_VERIFIED` | BMR-TEALADY-01 | 7 | — | 0 |  |
| ROLE-TEA-LADY-004 | `ENGINE_VERIFIED` | BMR-TEALADY-01 | 7 | — | 0 |  |
| ROLE-TEA-LADY-005 | `ROLE_LEVEL_ONLY` | BMR-TEALADY-01 | 7 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-TEA-LADY-006 | `ENGINE_VERIFIED` | BMR-ASSASSIN-01<br>BMR-TEALADY-01 | 11 | — | 0 |  |
| ROLE-TINKER-001 | `ENGINE_PARTIAL` | BMR-TINKER-01 | 8 | UI-061 | 3 | Part of the rule is left to the Storyteller (host-choice); the engine offers the legal options. |
| ROLE-TINKER-002 | `ROLE_LEVEL_ONLY` | BMR-TINKER-01 | 8 | UI-061 | 3 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-TINKER-003 | `ROLE_LEVEL_ONLY` | BMR-TINKER-01 | 8 | UI-061 | 3 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-TINKER-004 | `ENGINE_PARTIAL` | BMR-TINKER-01 | 8 | UI-061 | 3 | Part of the rule is left to the Storyteller (host-choice); the engine offers the legal options. |
| ROLE-TINKER-005 | `ROLE_LEVEL_ONLY` | BMR-TINKER-01 | 8 | UI-061 | 3 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-TINKER-006 | `ROLE_LEVEL_ONLY` | BMR-TINKER-01 | 8 | UI-061 | 3 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-TINKER-007 | `ROLE_LEVEL_ONLY` | BMR-TINKER-01 | 8 | UI-061 | 3 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-TOWN-CRIER-001 | `ENGINE_VERIFIED` | SNV-TOWNCRIER-01 | 4 | — | 0 |  |
| ROLE-TOWN-CRIER-002 | `ENGINE_VERIFIED` | SNV-TOWNCRIER-01 | 4 | — | 0 |  |
| ROLE-TOWN-CRIER-003 | `ROLE_LEVEL_ONLY` | SNV-TOWNCRIER-01 | 4 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-TOWN-CRIER-004 | `ROLE_LEVEL_ONLY` | SNV-TOWNCRIER-01 | 4 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-UNDERTAKER-001 | `ENGINE_VERIFIED` | TB-UNDERTAKER-01 | 15 | — | 0 |  |
| ROLE-UNDERTAKER-002 | `ENGINE_VERIFIED` | TB-UNDERTAKER-01 | 15 | — | 0 |  |
| ROLE-UNDERTAKER-003 | `ENGINE_VERIFIED` | TB-UNDERTAKER-01 | 15 | — | 0 |  |
| ROLE-UNDERTAKER-004 | `ROLE_LEVEL_ONLY` | TB-UNDERTAKER-01 | 15 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-UNDERTAKER-005 | `ENGINE_VERIFIED` | TB-UNDERTAKER-01 | 15 | — | 0 |  |
| ROLE-UNDERTAKER-006 | `ROLE_LEVEL_ONLY` | TB-UNDERTAKER-01 | 15 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-VIGORMORTIS-001 | `ENGINE_VERIFIED` | SNV-VIGORMORTIS-01 | 4 | — | 0 |  |
| ROLE-VIGORMORTIS-002 | `ENGINE_VERIFIED` | SNV-VIGORMORTIS-01 | 4 | — | 0 |  |
| ROLE-VIGORMORTIS-003 | `ENGINE_VERIFIED` | SNV-VIGORMORTIS-02 | 5 | — | 0 |  |
| ROLE-VIGORMORTIS-004 | `ENGINE_VERIFIED` | SNV-VIGORMORTIS-03 | 1 | — | 0 |  |
| ROLE-VIGORMORTIS-005 | `ENGINE_VERIFIED` | SNV-VIGORMORTIS-04 | 1 | — | 0 |  |
| ROLE-VIGORMORTIS-006 | `ROLE_LEVEL_ONLY` | SNV-VIGORMORTIS-01<br>SNV-VIGORMORTIS-02<br>SNV-VIGORMORTIS-03<br>SNV-VIGORMORTIS-04 | 11 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-VIGORMORTIS-007 | `ENGINE_VERIFIED` | SNV-VIGORMORTIS-02 | 5 | — | 0 |  |
| ROLE-VIRGIN-001 | `ENGINE_VERIFIED` | TB-VIRGIN-01 | 3 | UI-052 | 4 |  |
| ROLE-VIRGIN-002 | `ROLE_LEVEL_ONLY` | TB-VIRGIN-01 | 3 | UI-052 | 4 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-VIRGIN-003 | `ROLE_LEVEL_ONLY` | TB-VIRGIN-01 | 3 | UI-052 | 4 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-VIRGIN-004 | `ROLE_LEVEL_ONLY` | TB-VIRGIN-01 | 3 | UI-052 | 4 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-VIRGIN-005 | `ROLE_LEVEL_ONLY` | TB-VIRGIN-01 | 3 | UI-052 | 4 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-VORTOX-001 | `ENGINE_VERIFIED` | SNV-VORTOX-01 | 4 | — | 0 |  |
| ROLE-VORTOX-002 | `ENGINE_PARTIAL` | SNV-VORTOX-02 | 2 | — | 0 | Part of the rule is left to the Storyteller (host-choice); the engine offers the legal options. |
| ROLE-VORTOX-003 | `ROLE_LEVEL_ONLY` | SNV-VORTOX-01<br>SNV-VORTOX-02 | 6 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-VORTOX-004 | `ENGINE_VERIFIED` | SNV-VORTOX-01 | 4 | — | 0 |  |
| ROLE-VORTOX-005 | `ROLE_LEVEL_ONLY` | SNV-VORTOX-01<br>SNV-VORTOX-02 | 6 | — | 0 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-WASHERWOMAN-001 | `ENGINE_VERIFIED` | TB-WASHERWOMAN-01 | 16 | UI-023<br>UI-025 | 7 |  |
| ROLE-WASHERWOMAN-002 | `ENGINE_VERIFIED` | TB-WASHERWOMAN-01 | 16 | UI-023<br>UI-025 | 7 |  |
| ROLE-WASHERWOMAN-003 | `ROLE_LEVEL_ONLY` | TB-WASHERWOMAN-01 | 16 | UI-023<br>UI-025 | 7 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-WASHERWOMAN-004 | `ENGINE_VERIFIED` | TB-WASHERWOMAN-01 | 16 | UI-023<br>UI-025 | 7 |  |
| ROLE-WASHERWOMAN-005 | `ROLE_LEVEL_ONLY` | TB-WASHERWOMAN-01 | 16 | UI-023<br>UI-025 | 7 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-WASHERWOMAN-006 | `ROLE_LEVEL_ONLY` | TB-WASHERWOMAN-01 | 16 | UI-023<br>UI-025 | 7 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-WITCH-001 | `ENGINE_VERIFIED` | SNV-WITCH-01 | 3 | UI-045<br>UI-063 | 4 |  |
| ROLE-WITCH-002 | `ENGINE_VERIFIED` | SNV-WITCH-01 | 3 | UI-045<br>UI-063 | 4 |  |
| ROLE-WITCH-003 | `ROLE_LEVEL_ONLY` | SNV-WITCH-01 | 3 | UI-045<br>UI-063 | 4 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-WITCH-004 | `ENGINE_VERIFIED` | SNV-WITCH-01 | 3 | UI-045<br>UI-063 | 4 |  |
| ROLE-WITCH-005 | `ENGINE_VERIFIED` | SNV-WITCH-01 | 3 | UI-045<br>UI-063 | 4 |  |
| ROLE-ZOMBUUL-001 | `ENGINE_VERIFIED` | BMR-ZOMBUUL-01 | 5 | UI-051<br>UI-074 | 5 |  |
| ROLE-ZOMBUUL-002 | `ENGINE_VERIFIED` | BMR-ZOMBUUL-01 | 5 | UI-051<br>UI-074 | 5 |  |
| ROLE-ZOMBUUL-003 | `ENGINE_VERIFIED` | BMR-ZOMBUUL-01 | 5 | UI-051<br>UI-074 | 5 |  |
| ROLE-ZOMBUUL-004 | `ENGINE_VERIFIED` | BMR-ZOMBUUL-01<br>BMR-ZOMBUUL-02 | 6 | UI-051<br>UI-074 | 5 |  |
| ROLE-ZOMBUUL-005 | `ENGINE_VERIFIED` | BMR-ZOMBUUL-01 | 5 | UI-051<br>UI-074 | 5 |  |
| ROLE-ZOMBUUL-006 | `ROLE_LEVEL_ONLY` | BMR-ZOMBUUL-01<br>BMR-ZOMBUUL-02 | 6 | UI-051<br>UI-074 | 5 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ROLE-ZOMBUUL-007 | `ENGINE_VERIFIED` | BMR-ZOMBUUL-01 | 5 | UI-051<br>UI-074 | 5 |  |
| SETUP-001 | `ROLE_LEVEL_ONLY` | SYS-SETUP-01<br>SYS-SETUP-02<br>SYS-SETUP-03<br>SYS-SETUP-04 | 5 | UI-007<br>UI-008<br>UI-009<br>UI-010<br>UI-017 | 7 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| SETUP-002 | `ROLE_LEVEL_ONLY` | SYS-SETUP-01<br>SYS-SETUP-02<br>SYS-SETUP-03<br>SYS-SETUP-04 | 5 | UI-007<br>UI-008<br>UI-009<br>UI-010<br>UI-017 | 7 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| SETUP-003 | `ROLE_LEVEL_ONLY` | SYS-SETUP-01<br>SYS-SETUP-02<br>SYS-SETUP-03<br>SYS-SETUP-04 | 5 | UI-007<br>UI-008<br>UI-009<br>UI-010<br>UI-017 | 7 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| SETUP-004 | `ROLE_LEVEL_ONLY` | SYS-SETUP-01<br>SYS-SETUP-02<br>SYS-SETUP-03<br>SYS-SETUP-04 | 5 | UI-007<br>UI-008<br>UI-009<br>UI-010<br>UI-017 | 7 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| SETUP-005 | `ROLE_LEVEL_ONLY` | SYS-SETUP-01<br>SYS-SETUP-02<br>SYS-SETUP-03<br>SYS-SETUP-04 | 5 | UI-007<br>UI-008<br>UI-009<br>UI-010<br>UI-017 | 7 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| SETUP-006 | `ENGINE_VERIFIED` | SYS-SETUP-01 | 2 | UI-007<br>UI-008<br>UI-017 | 6 |  |
| SETUP-007 | `ROLE_LEVEL_ONLY` | SYS-SETUP-01<br>SYS-SETUP-02<br>SYS-SETUP-03<br>SYS-SETUP-04 | 5 | UI-007<br>UI-008<br>UI-009<br>UI-010<br>UI-017 | 7 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| SETUP-008 | `ROLE_LEVEL_ONLY` | SYS-SETUP-01<br>SYS-SETUP-02<br>SYS-SETUP-03<br>SYS-SETUP-04 | 5 | UI-007<br>UI-008<br>UI-009<br>UI-010<br>UI-017 | 7 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| SETUP-009 | `ROLE_LEVEL_ONLY` | SYS-SETUP-01<br>SYS-SETUP-02<br>SYS-SETUP-03<br>SYS-SETUP-04 | 5 | UI-007<br>UI-008<br>UI-009<br>UI-010<br>UI-017 | 7 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| SETUP-010 | `ROLE_LEVEL_ONLY` | SYS-SETUP-01<br>SYS-SETUP-02<br>SYS-SETUP-03<br>SYS-SETUP-04 | 5 | UI-007<br>UI-008<br>UI-009<br>UI-010<br>UI-017 | 7 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| SETUP-011 | `ROLE_LEVEL_ONLY` | SYS-SETUP-01<br>SYS-SETUP-02<br>SYS-SETUP-03<br>SYS-SETUP-04 | 5 | UI-007<br>UI-008<br>UI-009<br>UI-010<br>UI-017 | 7 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| SETUP-012 | `ROLE_LEVEL_ONLY` | SYS-SETUP-01<br>SYS-SETUP-02<br>SYS-SETUP-03<br>SYS-SETUP-04 | 5 | UI-007<br>UI-008<br>UI-009<br>UI-010<br>UI-017 | 7 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| SETUP-013 | `ROLE_LEVEL_ONLY` | SYS-SETUP-01<br>SYS-SETUP-02<br>SYS-SETUP-03<br>SYS-SETUP-04 | 5 | UI-007<br>UI-008<br>UI-009<br>UI-010<br>UI-017 | 7 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| SETUP-014 | `ENGINE_VERIFIED` | SYS-SETUP-04 | 1 | UI-010 | 4 |  |
| ST-001 | `ROLE_LEVEL_ONLY` | SYS-EFFECTS-01<br>SYS-PRIVACY-01 | 3 | UI-019<br>UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-066<br>UI-068<br>UI-069<br>UI-070<br>UI-074<br>UI-081<br>UI-083<br>UI-085<br>UI-086 | 24 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ST-002 | `ROLE_LEVEL_ONLY` | SYS-EFFECTS-01<br>SYS-PRIVACY-01 | 3 | UI-019<br>UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-066<br>UI-068<br>UI-069<br>UI-070<br>UI-074<br>UI-081<br>UI-083<br>UI-085<br>UI-086 | 24 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ST-003 | `ROLE_LEVEL_ONLY` | SYS-EFFECTS-01<br>SYS-PRIVACY-01 | 3 | UI-019<br>UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-066<br>UI-068<br>UI-069<br>UI-070<br>UI-074<br>UI-081<br>UI-083<br>UI-085<br>UI-086 | 24 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ST-004 | `ROLE_LEVEL_ONLY` | SYS-EFFECTS-01<br>SYS-PRIVACY-01 | 3 | UI-019<br>UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-066<br>UI-068<br>UI-069<br>UI-070<br>UI-074<br>UI-081<br>UI-083<br>UI-085<br>UI-086 | 24 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ST-005 | `ROLE_LEVEL_ONLY` | SYS-EFFECTS-01<br>SYS-PRIVACY-01 | 3 | UI-019<br>UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-066<br>UI-068<br>UI-069<br>UI-070<br>UI-074<br>UI-081<br>UI-083<br>UI-085<br>UI-086 | 24 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| ST-006 | `ROLE_LEVEL_ONLY` | SYS-EFFECTS-01<br>SYS-PRIVACY-01 | 3 | UI-019<br>UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-066<br>UI-068<br>UI-069<br>UI-070<br>UI-074<br>UI-081<br>UI-083<br>UI-085<br>UI-086 | 24 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| STATUS-001 | `ROLE_LEVEL_ONLY` | SYS-EFFECTS-01<br>SYS-EFFECTS-02<br>SYS-WINS-01 | 7 | UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| STATUS-002 | `ROLE_LEVEL_ONLY` | SYS-EFFECTS-01<br>SYS-EFFECTS-02<br>SYS-WINS-01 | 7 | UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| STATUS-003 | `ROLE_LEVEL_ONLY` | SYS-EFFECTS-01<br>SYS-EFFECTS-02<br>SYS-WINS-01 | 7 | UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| STATUS-004 | `ENGINE_VERIFIED` | SYS-EFFECTS-01 | 2 | UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-074 | 9 |  |
| STATUS-005 | `ENGINE_VERIFIED` | SYS-EFFECTS-06 | 1 | — | 0 |  |
| STATUS-006 | `ENGINE_VERIFIED` | SYS-EFFECTS-07 | 2 | — | 0 |  |
| STATUS-007 | `ROLE_LEVEL_ONLY` | SYS-EFFECTS-01<br>SYS-EFFECTS-02<br>SYS-WINS-01 | 7 | UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| STATUS-008 | `ROLE_LEVEL_ONLY` | SYS-EFFECTS-01<br>SYS-EFFECTS-02<br>SYS-WINS-01 | 7 | UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| STATUS-009 | `ROLE_LEVEL_ONLY` | SYS-EFFECTS-01<br>SYS-EFFECTS-02<br>SYS-WINS-01 | 7 | UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| STATUS-010 | `ROLE_LEVEL_ONLY` | SYS-EFFECTS-01<br>SYS-EFFECTS-02<br>SYS-WINS-01 | 7 | UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| STATUS-011 | `ROLE_LEVEL_ONLY` | SYS-EFFECTS-01<br>SYS-EFFECTS-02<br>SYS-WINS-01 | 7 | UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| STATUS-012 | `ROLE_LEVEL_ONLY` | SYS-EFFECTS-01<br>SYS-EFFECTS-02<br>SYS-WINS-01 | 7 | UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| STATUS-013 | `ROLE_LEVEL_ONLY` | SYS-EFFECTS-01<br>SYS-EFFECTS-02<br>SYS-WINS-01 | 7 | UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| STATUS-014 | `ROLE_LEVEL_ONLY` | SYS-EFFECTS-01<br>SYS-EFFECTS-02<br>SYS-WINS-01 | 7 | UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| STATUS-015 | `ROLE_LEVEL_ONLY` | SYS-EFFECTS-01<br>SYS-EFFECTS-02<br>SYS-WINS-01 | 7 | UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| STATUS-016 | `ROLE_LEVEL_ONLY` | SYS-EFFECTS-01<br>SYS-EFFECTS-02<br>SYS-WINS-01 | 7 | UI-032<br>UI-039<br>UI-040<br>UI-041<br>UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 14 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| VOTE-001 | `ROLE_LEVEL_ONLY` | SYS-VOTES-01<br>SYS-VOTES-02<br>SYS-VOTES-03<br>SYS-WINS-01<br>SYS-WINS-02 | 12 | UI-003<br>UI-047<br>UI-049<br>UI-050<br>UI-051<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 11 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| VOTE-002 | `ROLE_LEVEL_ONLY` | SYS-VOTES-01<br>SYS-VOTES-02<br>SYS-VOTES-03<br>SYS-WINS-01<br>SYS-WINS-02 | 12 | UI-003<br>UI-047<br>UI-049<br>UI-050<br>UI-051<br>UI-062<br>UI-064<br>UI-065<br>UI-074 | 11 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| VOTE-003 | `ENGINE_VERIFIED` | SYS-VOTES-04 | 1 | — | 0 |  |
| VOTE-004 | `ENGINE_VERIFIED` | SYS-VOTES-04 | 1 | — | 0 |  |
| VOTE-005 | `ENGINE_VERIFIED` | SYS-VOTES-03 | 1 | UI-051<br>UI-074 | 5 |  |
| WIN-001 | `ENGINE_VERIFIED` | SYS-WINS-02 | 6 | UI-065 | 4 |  |
| WIN-002 | `ROLE_LEVEL_ONLY` | SYS-WINS-01<br>SYS-WINS-02 | 9 | UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065 | 10 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| WIN-003 | `ROLE_LEVEL_ONLY` | SYS-WINS-01<br>SYS-WINS-02 | 9 | UI-047<br>UI-049<br>UI-050<br>UI-062<br>UI-064<br>UI-065 | 10 | Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified. |
| WIN-004 | `ENGINE_VERIFIED` | SYS-SETUP-05 | 1 | — | 0 |  |

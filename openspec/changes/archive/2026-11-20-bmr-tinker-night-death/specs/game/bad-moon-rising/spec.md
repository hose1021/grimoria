## MODIFIED Requirements

### Requirement: Tinker death

The engine SHALL record a Tinker death as a real ability death: a sober Tinker
can die during the day or the night, the Death carries `cause: "ability"` and
Tinker provenance, and the normal death consequences and win check run. An
impaired Tinker SHALL be rejected, by day and on the Tinker's night step, and
only the Tinker SHALL die on that step. A command recorded under an older
ruleset version SHALL keep the deaths it marked.

**Source**: [Tinker r1782](https://wiki.bloodontheclocktower.com/index.php?title=Tinker&oldid=1782) "At any time, you may decide that the Tinker dies."; [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039) "A drunk or poisoned player has no ability."; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/application/store/create-game-store.test.ts`, `scripts/browser-check.ts`

#### Scenario: Day death

- **WHEN** the Storyteller records the Tinker's death during the day
- **THEN** the Tinker dies with `cause: "ability"` and the Death names the Tinker

#### Scenario: Night death

- **WHEN** the Storyteller records the Tinker's death during the night
- **THEN** the Tinker dies with the same provenance

#### Scenario: Impaired Tinker

- **WHEN** the Tinker is drunk or poisoned
- **THEN** the death is rejected and the Tinker stays alive

#### Scenario: Impaired Tinker on the night step

- **WHEN** the host marks a drunk or poisoned Tinker's death on the Tinker's step, with the completion or with a later outcome
- **THEN** the command is rejected with `error.59`, the Tinker stays alive and the step is as it was

#### Scenario: Another player on the Tinker's step

- **WHEN** the host marks the death of a player other than the Tinker on the Tinker's step, alone or beside the Tinker's
- **THEN** the command is rejected with `error.51` and no one dies

#### Scenario: A command recorded under an older ruleset

- **WHEN** a journal recorded under `tb-bmr-snv-2026-11-10`, `tb-bmr-snv-2026-11-16`, `tb-bmr-snv-2026-11-17` or `tb-bmr-snv-2026-11-17.1` marked another player's or a drunk Tinker's death on the Tinker's step
- **THEN** the journal replays and undoes as written, and the same command sent now is rejected

#### Scenario: The table at 390 px

- **WHEN** the host opens a drunk Tinker's step at 390 px, picks "dies" and confirms
- **THEN** the rejection is shown, the sheet stays open and the Tinker stays alive; "lives" then completes the step, and a sober Tinker's "dies" kills the Tinker

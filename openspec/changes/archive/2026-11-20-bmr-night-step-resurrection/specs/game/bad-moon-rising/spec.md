## ADDED Requirements

### Requirement: Only a resurrecting ability brings a player back at night

The engine SHALL bring a dead player back on a Bad Moon Rising night step
only when the step's ability resurrects: the Professor's and the
Shabaloth's steps. The outcome of any other step, through the completion or
later, SHALL refuse a resurrection with `error.51` and change nothing. A
command recorded under an older ruleset version SHALL keep the resurrection
it marked.

**Source**: [Professor r1775](https://wiki.bloodontheclocktower.com/index.php?title=Professor&oldid=1775) "Once per game, at night*, choose a dead player: if they are a Townsfolk, they are resurrected."; [Shabaloth r1790](https://wiki.bloodontheclocktower.com/index.php?title=Shabaloth&oldid=1790) "A dead player you chose last night might be regurgitated."; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/bmr.test.ts`, `src/application/store/create-game-store.test.ts`, `scripts/browser-check.ts`

#### Scenario: A step whose ability does not resurrect

- **WHEN** the host marks a dead player's resurrection on the Tinker's or the Po's step, with the completion, beside a death, or with a later outcome
- **THEN** the command is rejected with `error.51`, the player stays dead and the step is as it was

#### Scenario: A Lunatic shown the Shabaloth

- **WHEN** a Lunatic shown the Shabaloth completes their step and the host marks a resurrection on it
- **THEN** the command is rejected with `error.51` and the player stays dead

#### Scenario: The Professor and the Shabaloth

- **WHEN** the Professor's or the Shabaloth's step brings a player back under its own rule
- **THEN** the player is alive again, as before

#### Scenario: A command recorded under an older ruleset

- **WHEN** a journal recorded under `tb-bmr-snv-2026-11-10`, `tb-bmr-snv-2026-11-16`, `tb-bmr-snv-2026-11-17`, `tb-bmr-snv-2026-11-17.1` or `tb-bmr-snv-2026-11-17.2` brought a player back on a step whose ability does not resurrect
- **THEN** the journal replays and undoes as written, and the same command sent now is rejected

#### Scenario: The table at 390 px

- **WHEN** the host opens the Professor's step at 390 px with a dead Townsfolk, picks them and confirms
- **THEN** the step offers the resurrection and the player is alive again
- **WHEN** the host then opens the Tinker's step while another player is dead
- **THEN** the step offers no resurrection, the engine refuses one with `error.51`, and "The Tinker survives" completes the step

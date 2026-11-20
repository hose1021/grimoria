# Spec Delta

## ADDED Requirements

### Requirement: A one-of-two answer names a role and two players

A `completeNightStep` answer for the Washerwoman, Librarian or Investigator
SHALL name one offered character and two different players that exist in the
state. A missing pair, a repeated player or an unknown player SHALL be refused
with `error.66` and SHALL leave the state and the journal unchanged.

**Source**: [Washerwoman r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630); [Librarian r1721](https://wiki.bloodontheclocktower.com/index.php?title=Librarian&oldid=1721); [Investigator r2983](https://wiki.bloodontheclocktower.com/index.php?title=Investigator&oldid=2983); [Issue #217](https://github.com/hose1021/grimoria/issues/217)
**Tests**: `src/core/engine/engine.test.ts` "a poisoned Washerwoman's answer is a Townsfolk and two different players (TB-WASHERWOMAN-01, SYS-EFFECTS-01)"

#### Scenario: The same player twice

- **WHEN** an impaired Washerwoman's answer names a Townsfolk and the same player in both pair entries
- **THEN** the command returns `requires-storyteller-choice` with `error.66`, and the state and the journal stay byte-identical

#### Scenario: An unknown player

- **WHEN** a pair entry does not resolve to a player in the state
- **THEN** the answer is refused with `error.66` before any mutation

#### Scenario: A missing pair

- **WHEN** the answer names a legal Townsfolk and no players
- **THEN** the answer is refused with `error.66` and the state stays byte-identical

### Requirement: A working one-of-two answer is the prepared record

While the ability works, the answer SHALL be the character and pair prepared in
setup; another character or another pair SHALL be refused with `error.66`. The
full check SHALL start at `tb-bmr-snv-2026-11-20.1`; an earlier command SHALL
keep the role-only check so its journal replays.

**Source**: [Washerwoman r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630); [Issue #217](https://github.com/hose1021/grimoria/issues/217)
**Tests**: `src/core/engine/engine.test.ts` "a healthy Washerwoman refuses an answer that is not the prepared one (TB-WASHERWOMAN-01)", `src/core/engine/engine.test.ts` "a journal recorded before the full one-of-two check replays a different healthy answer (TB-WASHERWOMAN-01)"

#### Scenario: A working ability

- **WHEN** a healthy Washerwoman's answer names another character or another pair
- **THEN** the command is refused and the prepared answer stays the only one the step can store

#### Scenario: The prepared record

- **WHEN** the answer repeats the prepared character and pair, with or without the Storyteller's wording
- **THEN** the command is allowed, the answer is stored on the step, and the journal replays it

#### Scenario: An older journal

- **WHEN** a journal recorded under `tb-bmr-snv-2026-11-19` contains a different healthy answer the old check accepted
- **THEN** the replay succeeds and reproduces the recorded state

### Requirement: A prepared answer names its players in the journal

The journal SHALL record a one-of-two answer with its character and the players
it names, not the opaque player ids alone, and SHALL show the Storyteller's
wording when the answer carries one.

**Source**: [Washerwoman r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630); [Issue #217](https://github.com/hose1021/grimoria/issues/217)
**Tests**: `src/core/engine/engine.test.ts` "a poisoned Washerwoman is a host choice on the command path and the answer completes the step (TB-WASHERWOMAN-01, SYS-EFFECTS-01)", `scripts/browser-check.ts`

#### Scenario: The journal detail

- **WHEN** a false-information one-of-two answer is applied without a wording
- **THEN** the choice line reads the character id followed by the players' names, and the console localizes the character

#### Scenario: The Storyteller's wording

- **WHEN** the answer carries `answerText`
- **THEN** the journal line shows that wording

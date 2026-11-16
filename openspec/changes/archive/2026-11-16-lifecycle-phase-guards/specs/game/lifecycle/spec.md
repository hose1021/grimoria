# Lifecycle Specification

## Purpose

Defines the game's play states, the only legal transitions between them, and
the phase precondition of every command, including atomic rejection outside it.

## ADDED Requirements

### Requirement: Lifecycle transition policy

The engine SHALL expose exactly the phases `setup`, `deal`, `seat`, `night`,
`day` and `over`. It SHALL allow `setup -> deal -> seat -> night`, repeat
`night <-> day`, and any non-over phase to `over`. It SHALL allow `over` to
`day` or `night` only through the explicit cleared-winner correction.

**Source**: [Rules Explanation r1310](https://wiki.bloodontheclocktower.com/index.php?title=Rules_Explanation&oldid=1310); `SPEC.md` "Domain rules"; `docs/adr/0002-engine-contracts.md` "6. Lifecycle"
**Tests**: `src/core/engine/lifecycle.test.ts`

#### Scenario: A full play cycle

- **WHEN** a prepared bag is dealt, seated and started
- **THEN** the phase moves `setup -> deal -> seat -> night`, `endNight` moves it to `day`, `endDay` moves it to `night`, and a declared winner moves it to `over`

#### Scenario: Play commands stop at over

- **WHEN** a night or day command runs after a winner is declared
- **THEN** the command is rejected with `error.6` and the winner and phase stay unchanged

#### Scenario: Cleared-winner correction reopens play

- **WHEN** the host applies the cleared-winner correction in `over`
- **THEN** the winner is cleared and the phase returns to `day` when a day exists, otherwise `night`

### Requirement: Per-command phase policy

Every command type SHALL declare the phases it may run in, and a command
invoked in another phase SHALL be rejected before its handler changes state.
Setup commands run in `setup`, `deal` or `seat`; `startNight` runs in `deal`,
`seat` or a resumable `night`; night steps run in `night`; day actions run in
`day`; host death and madness records run in `day` or `night`; seat-order and
setup secret corrections, notes, review, winner, correction, new-game and
import commands run in any phase.

**Source**: `SPEC.md` "Domain rules"; `docs/adr/0002-engine-contracts.md` "6. Lifecycle"
**Tests**: `src/core/engine/lifecycle.test.ts`

#### Scenario: Deal during night

- **WHEN** a deal command runs while the game is in `night`
- **THEN** it is rejected with `error.47` and no player, bag or phase field changes

#### Scenario: End night outside night

- **WHEN** `endNight` runs in `setup`, `deal`, `seat` or `day`
- **THEN** it is rejected with `error.78`, the day is not rebuilt and the phase is unchanged

#### Scenario: Day action at night

- **WHEN** a nomination, vote, execution or day-ability command runs in `night`
- **THEN** it is rejected with `error.7` and no nomination, vote or execution is recorded

#### Scenario: Bag reset cannot leave setup

- **WHEN** a bag command requests any phase other than `setup` with a roster reset
- **THEN** it is rejected with `error.47` and the script, roster and phase stay unchanged

#### Scenario: Host notes in any phase

- **WHEN** the host sets a note or opens the review in `setup`, `night`, `day` or `over`
- **THEN** the command is accepted and no phase changes

#### Scenario: Secret correction during play

- **WHEN** the host corrects a setup secret, such as the Fortune Teller herring, during a night
- **THEN** the command is accepted and the phase stays `night`

#### Scenario: Seat order correction during play

- **WHEN** the host uses the seat screen to reorder the seats during a night
- **THEN** the command is accepted and the phase stays `night`

### Requirement: Bag reset returns to setup

A bag command that resizes or resets the roster SHALL be accepted in any phase
and SHALL move the game to `setup`, because it starts a new bag. Any other bag
edit SHALL be rejected outside `setup`, `deal` and `seat`. A requested phase
SHALL be accepted only with a roster reset and only for `setup`.

**Source**: `SPEC.md` "Domain rules"; `docs/adr/0002-engine-contracts.md` "6. Lifecycle"
**Tests**: `src/core/engine/lifecycle.test.ts`

#### Scenario: Reset from night

- **WHEN** the host resets the roster count during a night
- **THEN** the phase becomes `setup`, the running night and day are cleared and the command is allowed

#### Scenario: Bag edit during night

- **WHEN** a bag role or bluff edit reaches the engine during a night
- **THEN** it is rejected with `error.47` and the script, roster and phase stay unchanged

### Requirement: Atomic phase rejection

A phase rejection SHALL leave the game byte-identical in Validate, Preview and
Apply: no player, queue, day, effect, log, journal or idempotency entry SHALL
change, and Preview SHALL report no events.

**Source**: `SPEC.md` "Domain rules"; `docs/adr/0002-engine-contracts.md` "6. Lifecycle"
**Tests**: `src/core/engine/lifecycle.test.ts`, `src/core/engine/commands.test.ts`

#### Scenario: Rejected end night keeps the day

- **WHEN** `endNight` is rejected because the phase is `day`
- **THEN** the canonical state before and after Validate, Preview and Apply is equal

#### Scenario: Rejected command records no journal

- **WHEN** a phase-rejected command is applied
- **THEN** the journal and the applied ledger keep their previous entries

### Requirement: One lifecycle for every supported edition

The phase policy SHALL be edition-independent. Trouble Brewing, Bad Moon
Rising, Sects and Violets and a same-edition custom script SHALL share the same
transitions and guards; a mixed-edition manual pool SHALL follow the same
phases while skipping the automatic night queue and win check.

**Source**: `SPEC.md` "Scenarios"; `docs/rules-sources.md` "Known limitations"
**Tests**: `src/core/engine/lifecycle.test.ts`, `src/core/engine/manual.test.ts`

#### Scenario: Bad Moon Rising day ends

- **WHEN** a Bad Moon Rising day ends in `day`
- **THEN** the phase moves to `night` under the same guard as Trouble Brewing

#### Scenario: Manual pool phase guard

- **WHEN** a manual-only mixed pool tries `endNight` during its `day`
- **THEN** it is rejected with `error.78` and the manual day stays unchanged

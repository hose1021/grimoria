# Spec Delta

## ADDED Requirements

### Requirement: Verified jinx behavior

Every official jinx SHALL have one implemented behavior, a pinned source and an
asserting behavioral test. A pair SHALL NOT be `verified` without that test. The
seven supported pairs SHALL be `verified`; the setup screens list no pair as
unsupported.

**Source**: `docs/official/jinxes.json` (committed 2026-11-11); [Issue #475](https://github.com/hose1021/grimoria/issues/475)
**Tests**: `src/core/engine/jinxes.test.ts`, `src/core/model/support.test.ts`

#### Scenario: Chambermaid and Mathematician

- **WHEN** the Chambermaid chooses an alive Mathematician and another player
- **THEN** the later Mathematician wake counts, and the answer is the number of
  chosen characters who woke tonight

#### Scenario: Drunk and Mathematician

- **WHEN** the Drunk's believed ability gives false information or fails
- **THEN** the Drunk carries an ABNORMAL reminder and the Mathematician counts
  the character once

#### Scenario: Fang Gu and Scarlet Woman

- **WHEN** the Fang Gu possession creates a second living Demon or another
  Demon lives at a Demon death
- **THEN** the Scarlet Woman remains a Minion

#### Scenario: Goon and Pit-Hag

- **WHEN** the Pit-Hag turns an evil player into the Goon and a good player
  later chooses the Goon
- **THEN** the chooser becomes drunk and the Goon stays evil

#### Scenario: Lunatic and Mathematician

- **WHEN** the Lunatic's chosen attack set differs from the acting Demon's,
  including a Demon that attacked nobody
- **THEN** the Lunatic carries one ABNORMAL reminder

#### Scenario: Mastermind and Vigormortis

- **WHEN** the Vigormortis killed the Mastermind, the Vigormortis later dies,
  and the Demon is executed
- **THEN** the dead Mastermind still arms the extra day

#### Scenario: Recluse and Sage

- **WHEN** the Sage is killed by the Demon and the Storyteller chooses a pair
  naming the Recluse
- **THEN** the pair is legal and the implied Recluse-as-Demon registration is
  journaled

### Requirement: Jinx host choices

A jinx that requires a Storyteller choice SHALL keep it as an existing
validated, journaled answer. The Sage pair and the Recluse registration SHALL
be stored on the step and reproduced by replay. No new command or state store
SHALL be introduced.

**Source**: [Sage r3009](https://wiki.bloodontheclocktower.com/index.php?title=Sage&oldid=3009); [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007)
**Tests**: `src/core/engine/jinxes.test.ts`, `src/core/engine/snv.test.ts`

#### Scenario: Recluse pair

- **WHEN** the host completes the Sage step with a pair naming the Recluse
- **THEN** the step stores the pair and a `registration: demon` answer, and the
  secret journal has both host-choice lines

## MODIFIED Requirements

### Requirement: Versioned jinx table

The app SHALL keep a jinx table pinned to a committed official resources
snapshot, SHALL include every official pair whose two characters are supported,
SHALL give each pair its official reason and a source that names the snapshot,
and SHALL register each pair in the versioned interaction registry with a
behavior status and its asserting test. A pair SHALL NOT be verified from
membership alone. A pool that can trigger an `unsupported` pair SHALL NOT run
automatically.

**Source**: [Official resources `jinxes.json`](https://release.botc.app/resources/data/jinxes.json); `docs/official/jinxes.json`; [Issue #475](https://github.com/hose1021/grimoria/issues/475)
**Tests**: `src/core/model/support.test.ts`, `src/core/model/script-definition.test.ts`, `src/core/engine/jinxes.test.ts`

#### Scenario: Official pair

- **WHEN** the registry is asked about two supported characters that have an
  official jinx
- **THEN** it returns the pair with its reason, snapshot source, behavior
  status and asserting test

#### Scenario: Pair without a jinx

- **WHEN** the registry is asked about two supported characters without an
  official jinx
- **THEN** it returns no pair

#### Scenario: Pair missing from the table

- **WHEN** the snapshot contains a supported pair that the table omits
- **THEN** the consistency test fails

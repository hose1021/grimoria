## ADDED Requirements

### Requirement: The Flowergirl answers through the information capability

The Flowergirl role module SHALL declare its every-night-except-the-first step
through `night-step` and SHALL answer through an `information` capability with
`infoKind: "flowergirl"`. The answer SHALL be whether a Demon voted on the day
that just ended, and SHALL name `[true, false]` as the possible answers in that
order. The module SHALL NOT read its own impairment or a Vortox.

**Source**: [Flowergirl r2907](https://wiki.bloodontheclocktower.com/index.php?title=Flowergirl&oldid=2907); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #211](https://github.com/hose1021/grimoria/issues/211)
**Tests**: `src/core/roles/flowergirl/role.test.ts`, `src/core/engine/snv.test.ts`

#### Scenario: A Demon voted

- **WHEN** a healthy Flowergirl completes her step after a day in which a seat that was a Demon voted
- **THEN** the step stores `true` as its answer with no options

#### Scenario: No Demon voted

- **WHEN** the ended day's voters held no Demon at vote time
- **THEN** the step stores `false`

#### Scenario: A later character change does not rewrite the answer

- **WHEN** the Demon seat changes character after the vote
- **THEN** the answer still follows the Demon voters recorded at vote time

### Requirement: The Town Crier answers through the information capability

The Town Crier role module SHALL declare its every-night-except-the-first step
through `night-step` and SHALL answer through an `information` capability with
`infoKind: "towncrier"`. The answer SHALL be whether a Minion nominated on the
day that just ended, and SHALL name `[true, false]` as the possible answers in
that order. The module SHALL NOT read its own impairment or a Vortox.

**Source**: [Town Crier r3145](https://wiki.bloodontheclocktower.com/index.php?title=Town_Crier&oldid=3145); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #211](https://github.com/hose1021/grimoria/issues/211)
**Tests**: `src/core/roles/towncrier/role.test.ts`, `src/core/engine/snv.test.ts`

#### Scenario: A Minion nominated

- **WHEN** a healthy Town Crier completes their step after a day in which a seat that was a Minion nominated
- **THEN** the step stores `true` as its answer with no options

#### Scenario: No Minion nominated

- **WHEN** the ended day's nominators held no Minion at nomination time
- **THEN** the step stores `false`

### Requirement: The information context carries the ended-day vote facts

The engine SHALL give an `information` capability the vote facts of the day that
just ended: whether a Demon voted and whether a Minion nominated. The fact SHALL
be null when there is no complete ended-day ledger: no day, a different day
number, a non-array nomination list, or a `voteCounts` map. The fact SHALL read
the vote-time snapshots first and SHALL fall back to the current roles of the
voters and the nominator for a legacy ledger.

**Source**: [Flowergirl r2907](https://wiki.bloodontheclocktower.com/index.php?title=Flowergirl&oldid=2907), [Town Crier r3145](https://wiki.bloodontheclocktower.com/index.php?title=Town_Crier&oldid=3145); `docs/adr/0002-engine-contracts.md` §4; [Issue #211](https://github.com/hose1021/grimoria/issues/211)
**Tests**: `src/core/engine/information-facts.test.ts`, `src/core/engine/snv.test.ts`

#### Scenario: An aggregate ledger is no answer

- **WHEN** the ended day records host vote totals, an empty map included, or a dead-vote token
- **THEN** the fact is null and the engine asks the host

#### Scenario: A legacy ledger without a snapshot

- **WHEN** a nomination has no `demonVoters` or `minionNomination`
- **THEN** the fact reads the current roles of the voters and the nominator, as the engine did before the move

#### Scenario: Another day's ledger

- **WHEN** `lastDay.number` is not the night number minus one
- **THEN** the fact is null

### Requirement: The Flowergirl and Town Crier keep the shared answer wrapper

The role modules SHALL return the true boolean and both possible values whether
or not their owner is impaired, and SHALL NOT mark an answer as false. The
engine SHALL keep the no-day record, the impairment flag, the living-Vortox
rule, the options, the suffixes, the text keys, the stored Russian text and the
answer shape unchanged.

**Source**: [Flowergirl r2907](https://wiki.bloodontheclocktower.com/index.php?title=Flowergirl&oldid=2907), [Town Crier r3145](https://wiki.bloodontheclocktower.com/index.php?title=Town_Crier&oldid=3145), [Vortox r3017](https://wiki.bloodontheclocktower.com/index.php?title=Vortox&oldid=3017), [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165); [Issue #211](https://github.com/hose1021/grimoria/issues/211)
**Tests**: `src/core/engine/snv.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: An impaired owner may still receive the truth

- **WHEN** the Flowergirl or Town Crier is drunk or poisoned
- **THEN** the host is asked, the true value stays among the options, and `mayBeFalseSuffix` is true

#### Scenario: A living Vortox forbids the truth

- **WHEN** a living, unimpaired Vortox is in play
- **THEN** the options exclude the true value, `falsifiedSuffix` is true and `mayBeFalseSuffix` is false

#### Scenario: A missing day is a host answer

- **WHEN** there is no complete ended-day ledger
- **THEN** the record keeps `hostAnswer: true`, `options: [true, false]` and `note.sv.noDay`

#### Scenario: The stored record is unchanged

- **WHEN** the same step is completed before and after the move
- **THEN** the `given` record, the text key, the text, the log lines, the command events and the command result are identical

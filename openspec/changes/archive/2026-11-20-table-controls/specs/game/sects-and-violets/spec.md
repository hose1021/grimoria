## ADDED Requirements

### Requirement: Incomplete manual voting requires host information

When the preceding day contains manually recorded totals or dead-vote token
bookkeeping, Flowergirl and Town Crier SHALL require a host answer even if a
partial nomination ledger exists. Totals and token use SHALL NOT establish
whether a Demon voted or a Minion nominated.

**Source**: [Flowergirl r2907](https://wiki.bloodontheclocktower.com/index.php?title=Flowergirl&oldid=2907), [Town Crier r3145](https://wiki.bloodontheclocktower.com/index.php?title=Town_Crier&oldid=3145)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Total without identities

- **WHEN** the previous day contains a manual total but no complete voter identities
- **THEN** both roles require the Storyteller's yes or no

#### Scenario: Token-only record

- **WHEN** only a dead-vote marker was recorded outside the nomination ledger
- **THEN** the role information still requires the Storyteller's answer

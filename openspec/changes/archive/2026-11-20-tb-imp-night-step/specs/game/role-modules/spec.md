## ADDED Requirements

### Requirement: Imp night capability

The Imp role module SHALL resolve its night choice through the `night-step`
capability on every night except the first. A choice SHALL return an `attack`
decision on the chosen player under the Imp's log title, and the same decision
when the Imp is impaired. The Trouble Brewing step completion SHALL keep no
Imp branch.

**Source**: [Imp r3116](https://wiki.bloodontheclocktower.com/index.php?title=Imp&oldid=3116), [Mayor r2995](https://wiki.bloodontheclocktower.com/index.php?title=Mayor&oldid=2995), [Monk r3124](https://wiki.bloodontheclocktower.com/index.php?title=Monk&oldid=3124), [Soldier r3121](https://wiki.bloodontheclocktower.com/index.php?title=Soldier&oldid=3121), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/imp/role.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: The Imp kills the chosen player

- **WHEN** a healthy Imp chooses a living, unprotected player who is not a working Mayor
- **THEN** that player dies of the Demon's attack, the step records the outcome and the victim's note, and the secret log holds the death line and then the attack line

#### Scenario: Nobody dies

- **WHEN** the Imp is drunk or poisoned, or the chosen player is dead, protected by the Monk or a healthy Soldier
- **THEN** no death is recorded, the step records the reason as its note, and the attack line is marked as prevented

#### Scenario: The Imp chooses themself

- **WHEN** a healthy Imp chooses their own seat and one Minion is alive
- **THEN** the Imp dies, that Minion becomes the Imp inside the same step, its remaining step is skipped and the new Demon's wake is queued

#### Scenario: Several Minions are alive

- **WHEN** a healthy Imp kills themself, no Scarlet Woman inherits and several Minions are alive
- **THEN** the step holds the heir question, no winner is declared and the night cannot end until the host names the heir

#### Scenario: The attack ends the game

- **WHEN** the Imp's kill leaves two players alive
- **THEN** evil wins from the attack step, after the attack line is written

#### Scenario: Outcomes do not change

- **WHEN** the same Imp attack is completed before and after the move
- **THEN** the death, the step, the log lines, the ids, the command events, the order of draws from the command clock and identifier stream, and the command result are identical

### Requirement: Attack decision

The capability contract SHALL expose an `attack` decision that names the
chosen player and the title of the attack's log line. The engine SHALL resolve
it through the shared attack path with the acting seat as the attacker and the
host's answer as the Mayor's redirect. The decision SHALL NOT name the
attacker, the redirect or the cause of death.

**Source**: [Imp r3116](https://wiki.bloodontheclocktower.com/index.php?title=Imp&oldid=3116); `docs/adr/0002-engine-contracts.md` §3; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: The acting seat attacks

- **WHEN** a resolver returns an `attack` decision
- **THEN** the attack is resolved for the seat that takes the step, and the coordinator hands the outcome back under the title the role gave

#### Scenario: The step keeps the attack's own record

- **WHEN** an attack is resolved
- **THEN** the step result is the attack outcome and the secret log line carries the role's title, not the shared step line

#### Scenario: A role names what the engine owns

- **WHEN** a role names the attacker, the redirect or the cause of death in the decision
- **THEN** the type check rejects the module

### Requirement: An attack that needs the host waits untouched

When an attack would kill a working Mayor and the host has not answered the
redirect, the engine SHALL return the question with every other player as an
option and SHALL NOT change the game state, the journal or the log, nor draw
from the command clock or identifier stream. A step completed with the answer
SHALL journal the redirect before the attack line.

**Source**: [Mayor r2995](https://wiki.bloodontheclocktower.com/index.php?title=Mayor&oldid=2995); `docs/adr/0002-engine-contracts.md` §4; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: The host has not answered

- **WHEN** the Imp attacks a working Mayor and the command carries no redirect
- **THEN** the command returns a Storyteller choice with the redirect options, and the game, the journal and the command stream are as they were

#### Scenario: The host names another player

- **WHEN** the command is sent again with a living, unprotected player as the redirect
- **THEN** that player dies, the Mayor lives, and the secret log holds the death, the redirect and the attack line in that order

#### Scenario: The host lets the Mayor die

- **WHEN** the redirect answer is that nobody takes the Mayor's place
- **THEN** the Mayor dies, the answer is journaled and the death is not marked as redirected

#### Scenario: The attack would not kill the Mayor

- **WHEN** the Imp is impaired, or the Mayor is impaired, dead, protected by the Monk
- **THEN** the host is asked for no redirect

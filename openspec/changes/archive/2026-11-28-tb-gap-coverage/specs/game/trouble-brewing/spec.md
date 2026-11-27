## ADDED Requirements

### Requirement: Saint execution follows the executed alignment

An unimpaired Saint's execution SHALL make the executed Saint's own team lose:
a good Saint SHALL make evil win and an evil-aligned Saint SHALL make good win.

**Source**: [Saint r3119](https://wiki.bloodontheclocktower.com/index.php?title=Saint&oldid=3119)
**Tests**: `src/core/engine/tb-audit.test.ts`

#### Scenario: Evil Saint executed

- **WHEN** a Saint whose real team is evil is executed by the town
- **THEN** the game ends with good as the winner and `saint` as the reason

#### Scenario: Good Saint executed

- **WHEN** a good Saint is executed by the town
- **THEN** the game still ends with evil as the winner

#### Scenario: Execution without a death

- **WHEN** an execution causes no death
- **THEN** no Saint loss is recorded and the game continues

### Requirement: Trouble Brewing execution, registration and information branches

The engine SHALL cover the remaining Trouble Brewing branches on the public
command paths: a Monk protection does not stop an execution, a Soldier dies by
execution, a dead player's nomination does not spend the Virgin, a daytime
Slayer kill gives the Undertaker nothing, and a Baron's composition change
survives the Baron's death. Registrations SHALL remain per-ability and SHALL
never change the real role or alignment.

**Source**: [Monk r3124](https://wiki.bloodontheclocktower.com/index.php?title=Monk&oldid=3124), [Soldier r3121](https://wiki.bloodontheclocktower.com/index.php?title=Soldier&oldid=3121), [Virgin r1729](https://wiki.bloodontheclocktower.com/index.php?title=Virgin&oldid=1729), [Undertaker r3115](https://wiki.bloodontheclocktower.com/index.php?title=Undertaker&oldid=3115), [Baron r2961](https://wiki.bloodontheclocktower.com/index.php?title=Baron&oldid=2961), [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007), [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118)
**Tests**: `src/core/engine/tb-audit.test.ts`

#### Scenario: Per-ability registration

- **WHEN** two abilities act in the same night
- **THEN** each answers from its own Spy or Recluse registration and the real role and alignment stay unchanged

#### Scenario: Registered ability is not granted

- **WHEN** a Spy registers as a Townsfolk or a Recluse registers as a Demon
- **THEN** neither gains that character's night step or ability

#### Scenario: Scarlet Woman as the new Demon

- **WHEN** a Scarlet Woman inherits the Demon role
- **THEN** she attacks on the next night and her death wins for good

### Requirement: Trouble Brewing setup and information coverage

Default setup SHALL give the Fortune Teller a good red herring that answers
yes for the same seat all game, a dead Demon SHALL still answer yes, first-night
demon information SHALL name the living Minions and exactly three good
out-of-play bluffs, and the Librarian and Washerwoman answers SHALL follow their
pinned clauses.

**Source**: [Fortune Teller r3123](https://wiki.bloodontheclocktower.com/index.php?title=Fortune_Teller&oldid=3123), [Imp r3116](https://wiki.bloodontheclocktower.com/index.php?title=Imp&oldid=3116), [Librarian r1721](https://wiki.bloodontheclocktower.com/index.php?title=Librarian&oldid=1721), [Washerwoman r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630), [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165)
**Tests**: `src/core/engine/tb-audit.test.ts`

#### Scenario: Red herring lasts

- **WHEN** default setup assigns the red herring and a later night asks for the same seat
- **THEN** the Fortune Teller still hears yes

#### Scenario: Drunk is an Outsider

- **WHEN** the Librarian is shown the Drunk
- **THEN** the answer is the Outsider `drunk`, never the Drunk's Townsfolk mask

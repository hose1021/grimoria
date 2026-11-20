## ADDED Requirements

### Requirement: Lunatic default mask and explicit override

Setup SHALL use the selected real Demon as the Lunatic's default shown role
regardless of selection order, SHALL permit an explicit different Demon from
the script, and SHALL preserve a legal override until the host resumes the
default. Legacy masks without mode metadata SHALL be preserved.

**Source**: [Lunatic r3112](https://wiki.bloodontheclocktower.com/index.php?title=Lunatic&oldid=3112)
**Tests**: `src/core/engine/setup.test.ts`, `scripts/browser-check.ts`

#### Scenario: Lunatic selected before Demon

- **WHEN** the host selects the Lunatic and then Shabaloth without an override
- **THEN** the effective mask and dealt Lunatic card show Shabaloth

#### Scenario: Host override and reset

- **WHEN** the host chooses Po explicitly and later changes the real Demon
- **THEN** Po remains selected until the host resumes following the real Demon

### Requirement: Independent host-shuffled bluff pools

Setup SHALL offer separate Demon and Lunatic bluff lists and SHALL shuffle
each only on a host action. Demon choices SHALL retain the existing free-good
role restriction and seven-player minimum; Lunatic choices SHALL allow any
good script role including in-play roles. A shuffle SHALL choose three unique
eligible roles using deterministic command randomness, or reject when the
pool is insufficient. Legacy missing Lunatic lists SHALL use the Demon list.

**Source**: [Lunatic r3112](https://wiki.bloodontheclocktower.com/index.php?title=Lunatic&oldid=3112), [Glossary r3168](https://wiki.bloodontheclocktower.com/index.php?title=Glossary&oldid=3168), [Imp r3116](https://wiki.bloodontheclocktower.com/index.php?title=Imp&oldid=3116)
**Tests**: `src/core/engine/setup.test.ts`, `scripts/browser-check.ts`

#### Scenario: Occupied good character

- **WHEN** a good role is assigned in the bag
- **THEN** it is absent from Demon bluff choices and available for Lunatic bluffs

#### Scenario: Independent shuffle and persistence

- **WHEN** the host shuffles one bluff list and reloads or replays the command
- **THEN** the same three eligible choices are restored and the other list is unchanged

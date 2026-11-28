# Spec Delta

## ADDED Requirements

### Requirement: Swap one rolled role

Setup SHALL list the bag's roles grouped by type and SHALL offer, for any one
role, only the script roles of the same type that are not in the bag and keep
the exact player-count composition after the swap. A swap SHALL keep every
other legal setup choice and redraw only a Demon bluff or Drunk mask the swap
put in play; the automatic Lunatic mask SHALL follow the Demon and the Evil
Twin's good twin SHALL follow the swapped role.

**Source**: [Setup r1361](https://wiki.bloodontheclocktower.com/index.php?title=Setup&oldid=1361), [Baron r2961](https://wiki.bloodontheclocktower.com/index.php?title=Baron&oldid=2961), [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165)
**Tests**: `src/core/model/bag-swap.test.ts`, `scripts/browser-check.ts`

#### Scenario: Modifier that breaks the counts

- **WHEN** an eight-player Bad Moon Rising bag holds one Outsider and the host swaps its Minion
- **THEN** the Godfather is not offered and the other unused Minions are

#### Scenario: Swapped-in bluff

- **WHEN** the host swaps a Townsfolk for a role that was a Demon bluff
- **THEN** the bag stays legal, the other two bluffs stay and a new unused good role fills the third

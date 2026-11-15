# Spec Delta

## ADDED Requirements

### Requirement: Execution protection resolves before the Zombuul replacement

When an executed Zombuul is protected by the Devil's Advocate, the execution
SHALL not replace the death. The Zombuul SHALL stay alive, keep its life token
and keep its own first-death replacement.

**Source**: [Devil's Advocate r2594](https://wiki.bloodontheclocktower.com/index.php?title=Devil%27s_Advocate&oldid=2594) "Examples"; Issue #218
**Tests**: `src/core/engine/bmr.test.ts`

#### Scenario: The protected Zombuul is executed

- **WHEN** the Advocate protected the Zombuul for today and the town executes it
- **THEN** the Zombuul stays alive, is not registered dead and its own first
  death is not spent

### Requirement: The Moonchild uses the choice-time alignment

The Moonchild's curse SHALL decide from the chosen player's alignment at the
moment of the public choice, not at the moment the curse resolves.

**Source**: [Moonchild r1783](https://wiki.bloodontheclocktower.com/index.php?title=Moonchild&oldid=1783) "Summary"; Issue #218
**Tests**: `src/core/engine/bmr.test.ts`

#### Scenario: A good Goon turns evil before the curse resolves

- **WHEN** the Moonchild chooses a good Goon and the Goon becomes evil that night
- **THEN** the Goon still dies

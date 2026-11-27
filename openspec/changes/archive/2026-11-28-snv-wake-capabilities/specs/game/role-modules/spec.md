# Spec Delta

## ADDED Requirements

### Requirement: The Philosopher, Seamstress and Witch wake on the night-step capability

The Philosopher, the Seamstress and the Witch role modules SHALL each declare
their wake through one `night-step` capability with `timing: "any"`, SHALL keep
the same step shape, optional flag, information kind and actor predicate, and
SHALL NOT declare a resolver or a legacy night step. The engine SHALL keep the
Philosopher's borrowed-ability path, the Seamstress's stored answer and the
Witch's curse behavior.

**Source**: [Philosopher r2421](https://wiki.bloodontheclocktower.com/index.php?title=Philosopher&oldid=2421); [Seamstress r1999](https://wiki.bloodontheclocktower.com/index.php?title=Seamstress&oldid=1999); [Witch r2682](https://wiki.bloodontheclocktower.com/index.php?title=Witch&oldid=2682); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #211](https://github.com/hose1021/grimoria/issues/211)
**Tests**: `src/core/roles/philosopher/role.test.ts`, `src/core/roles/seamstress/role.test.ts`, `src/core/roles/witch/role.test.ts`, `src/core/roles/night-step.test.ts`

#### Scenario: First and later nights

- **WHEN** the first night or a later night builds the step for the Philosopher, the Seamstress or the Witch
- **THEN** the `night-step` capability builds the same step the legacy field built, and no resolver is declared

#### Scenario: Unspent once-per-game ability

- **WHEN** the Philosopher or the Seamstress is still waking and `used.philosopher` or `used.seamstress` is unset
- **THEN** the actor returns the holder, and returns no wake once the ability is spent or the holder no longer wakes

#### Scenario: The Witch loses the ability at three living players

- **WHEN** exactly three players live
- **THEN** the Witch's actor returns no wake while the other step fields stay unchanged

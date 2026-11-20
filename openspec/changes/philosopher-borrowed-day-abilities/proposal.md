# Proposal

Issue: #320

## Why

Philosopher r2421: the Philosopher chooses "any good character" and uses that
ability. Some day paths read the printed role instead of the ability:

- `useSlayer` required `effectiveRoleId === "slayer"`, so a borrowed Slayer was
  refused with `error.29`.
- `tinkerDeath` required `roleId === "tinker"`, so a borrowed Tinker could not
  die by the ability.
- `nominate` and `virginTriggers` required `roleId === "virgin"`, so a borrowed
  Virgin never triggered.
- `moonchildChoice` and the Moonchild step required `roleId === "moonchild"`.
- The console offered the Slayer, Virgin, Tinker and Moonchild forms by printed
  role, so the Philosopher's holder never saw them.

The Drunk must stay inert for a hidden consequence: its shown character is not
its ability (Drunk r3165). The public Slayer attempt is the one exception
already fixed by #315: the Drunk may attempt and nothing happens.

## What changes

- Two named predicates: `hasAbility` (printed or shown effective role, or a
  borrowed good role) for a public attempt, and `hasTrueAbility` (printed or
  borrowed, never a Drunk's shown role) for a hidden consequence.
- The engine and the console use the same predicate for each day ability:
  Slayer and Juggler use `hasAbility`; Tinker, Virgin and Moonchild use
  `hasTrueAbility`.
- The Moonchild step and choice resolve for a real or borrowed holder only.

## Out of scope

- The cross-edition combinations are not reachable in a supported script (the
  app forbids mixed editions outside manual-only mode). The contract is uniform
  anyway, so a future supported combination cannot inherit the defect.
- Night information and the once-per-game bookkeeping are unchanged.

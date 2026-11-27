# Design

## What the modules declared

```ts
// gambler/role.ts
nightStep: { target: "one-any", canKill: false, noteKey: "note.bmr.gambler" },
ability: { resolve({ actorId, targetIds, chosenRoleId, impaired, actualRoleOf, hasPlayer }) { … } },

// pukka/role.ts
nightStep: { target: "one-any", noteKey: "note.bmr.pukka" },
ability: { resolve({ actorId, targetIds, impaired, at, pendings }) { … } },
```

```ts
// night-step.ts
export function nightResolverFor(module, night) {
  if (!module) return undefined;
  if (hasArms(module)) return armFor(module, night === 1 ? "first" : "other")?.resolve;
  const ability = module.ability;
  return ability ? (context) => ability.resolve(context) : undefined;
}
```

The legacy lookup gave both roles the same step and the same resolver on
every night, the first included.

## What they declare now

```ts
// gambler/role.ts
capabilities: [
  { kind: "night-step", timing: "other",
    step: { target: "one-any", canKill: false, noteKey: "note.bmr.gambler" },
    resolve({ … }) { … } },
],

// pukka/role.ts
capabilities: [
  { kind: "night-step", timing: "any",
    step: { target: "one-any", noteKey: "note.bmr.pukka" },
    resolve({ … }) { … } },
],
```

The step objects hold the same fields with the same values. The body of each
resolver is the old body with a deeper indent: `git diff -w` of the Pukka's
module shows the wrapper lines only.

`nightResolverFor` returns `armFor(module, …)?.resolve` and has no second
form. `RoleModule.ability` and the `RoleAbility` type are removed.

## The timing of each role

- **The Pukka: `any`.** "Each night, choose a player"; "Unlike other Demons,
  the Pukka acts during the first night" (r3074). The printed order lists the
  Pukka on the first night and on the other nights.
- **The Gambler: `other`.** "Each night\*"; "Each night except the first, wake
  the Gambler" (r3073). The printed first-night order does not list the
  Gambler.

A timing must agree with the printed order: the existing test "a night-step
arm agrees with the printed night order of its edition" fails for a Gambler
declared for `any` night, so `other` is the one timing the contract accepts.

This is the one result of the lookup that differs. For the first night the
legacy fields gave the Gambler a step and a resolver; the arm gives neither.
The three readers of a declared step in `bmr.ts` never asked for it:

1. `buildBmrNightQueue` walks the printed order of the night and looks up the
   roles it finds there. The Gambler is not in the first-night order.
2. `restoreResurrectedSteps` returns before the lookup when the role has no
   slot in the order of the night.
3. The Lunatic's mask reads `otherNightStepOf` of the Demon it was shown,
   which is the same step for the Pukka on both forms.

`completeBmrStep` asks for the resolver of the step it completes, so it can
ask for the Gambler's first-night resolver only if a Gambler step exists on
the first night, and none does. The Monk and the Imp are declared the same
way in Trouble Brewing.

## What does not move

No file under `src/core/engine` changes. The references that stay:

- `makeBmrStep` names the Gambler (and the Courtier) to attach the characters
  of the script to the step. It is the shape of the question the table asks,
  and the same list serves the Courtier, which has not moved.
- `DEMON_ROLES` names the Pukka for the note a Demon's step yields while a
  Lunatic lives and for the Lunatic's report.
- The Exorcist's branch names the Pukka to resolve the death that waits when
  the Demon does not wake.
- `recordBmrOutcome` names the Pukka to answer the outcome panel with the
  deaths the step already resolved.
- `pukka.ts` is the shared delayed-death mechanic behind the `poison`,
  `delay-death`, `suspend-death`, `release-poisons` and `resolve-death`
  intents.

## The ledger

`scripts/role-ownership.ts` read `ability: {` in a module as a fact and
counted it as a capability. The field no longer exists, so the fact and its
branch in the owner classifier are removed. Both rows keep their owner,
"capability + engine reference"; the category counts stay 5, 15 and 51.

## The specs

The baseline requirement "A role module may declare a resolvable ability" is
modified: the resolver is declared on a `night-step` capability and in no
other field.

The requirement "A role module declares its night step as a capability" was
added by `tb-night-step-capabilities`, which is not archived yet. Two of its
scenarios describe the removed fallback ("its `ability` as the resolver") and
the removed field. This change modifies that requirement, so it must be
archived after `tb-night-step-capabilities`, in the order the changes merged.

## Proof

- **Characterization first.** Six tests were added to `bmr.test.ts` on the
  untouched modules and committed before the move: the queue of three nights
  with the full record of both steps; a Lunatic who is shown the Pukka; the
  record and the effects of the Pukka's first-night step; a drunk Pukka on
  the first night; a Gambler who names no character; the log and the record
  of a wrong guess. They pass unchanged after the move.
- **The existing tests.** The 127 tests `bmr.test.ts` had on main, four of
  them named for the Gambler and twenty-one for the Pukka, are untouched and
  pass.
- **Role tests.** The role tests reach the resolver through
  `nightResolverFor`, as the role tests of the other moved roles do. Their
  expected decisions are unchanged. One test per module asserts the declared
  step and timing; both failed before the move.
- **Compile-time check.** A module with an `ability` field is rejected.
- **Differential run.** A seeded driver plays 200 games per edition through
  `applyCommand` on main and on this change and compares the digest of every
  final state and of every command result. For this change the driver leans
  Bad Moon Rising games toward a Gambler, a Pukka, a Lunatic, a Goon and the
  roles that make another player drunk, sends right and wrong guesses and no
  guess, leans the Pukka toward itself and toward its previous victim, and
  sends outcome commands for both steps.
- **Mutation checks.** Single changes to the two modules, the lookup, the
  engine paths the two roles use and the ledger are made and reverted; each
  must fail a test.

## A finding, not fixed here

The driver found a step the engine refuses, the same on main and on this
change. A Pukka that chose itself on an earlier night is poisoned by its own
poison. When it then chooses a sober, healthy Goon, the command is rejected
with `CYCLIC_EFFECT_DEPENDENCY`: the drunkenness the Goon gives its chooser
and the Pukka's poison on itself both have the Pukka as source and target.
The Storyteller has to choose another player or skip the step. The choice is
legal: "The Goon still changes alignment, and makes the player drunk, if the
player choosing the Goon was already drunk or poisoned" (Goon r2977). The
effect graph and the Goon's trigger are not part of this change; a fix is a
change of behavior and needs its own issue and rule check.

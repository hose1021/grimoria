# Bad Moon Rising night steps as capabilities: the Gambler and the Pukka

Issue: #200

## Why

The Gambler and the Pukka were the first two roles whose rule moved into the
module (ADR 0001). They declare the resolver in a field of its own, `ability`,
beside a legacy `nightStep`. Every role that moved after them declares the
resolver on a `night-step` capability, with the nights it covers and the step
the queue builds. So one thing has two forms: `nightResolverFor` reads the
capability and falls back to `ability`, the ownership ledger has a module fact
for the old field, and the two oldest migrated modules do not look like the
others.

ADR 0002 says that a legacy field "is deleted in the same slice as the move".
This change starts slice 3, "Night steps: Bad Moon Rising remainder", by
moving the two roles that already own their rule to the one form, and removes
the old field from the contract.

## What changes

- The Gambler's module declares its step and its resolver on a `night-step`
  capability for the nights after the first ("Each night\*", Gambler r3073).
- The Pukka's module declares its step and its resolver on a `night-step`
  capability for every night ("Each night"; "the Pukka acts during the first
  night", Pukka r3074).
- `RoleModule` has no `ability` field and the `RoleAbility` type is removed.
  A module that declares a resolver outside a capability does not compile.
- `nightResolverFor` reads the `night-step` capability and nothing else: a
  module without one owns no resolver.
- `scripts/role-ownership.ts` no longer reports an `ability` module fact. In
  `docs/role-ownership.md` both rows declare `capability:night-step`.

## What stays

- **The two rules.** The body of each resolver is moved as it is: the same
  facts read, the same decisions returned.
- **The engine.** No file under `src/core/engine` changes. `completeBmrStep`
  runs a declared resolver through `applyRoleAbility` as before.
- **The engine references of the two roles.** The step builder still names
  the Gambler for the list of characters to guess. The Demon set, the
  Exorcist's block, the guard of the outcome panel and the delayed death in
  `pukka.ts` still name the Pukka. They are not the completion of the step.

## Impact

Behavior is unchanged. The queue of every night, the record of each step, the
effects, the deaths, the log lines, the command results and the order of draws
from the command ports stay the same, so saved games and journals replay as
before. No storage, command payload, schema or pin changes.

One lookup result differs and no path reads it: for the first night the
lookup returned the Gambler's legacy step and resolver, and now returns
nothing, as for the Monk and the Imp. The printed first-night order of Bad
Moon Rising does not list the Gambler, so no reader asked for it.

The other Bad Moon Rising roles keep their legacy step and their branch in
`completeBmrStep` until their own changes.

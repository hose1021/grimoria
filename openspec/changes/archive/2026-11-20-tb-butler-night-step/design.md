# Design

## What the branch did

```ts
const impaired = isImpaired(state, actor.id, at);
actor.butlerMasterId = targets[0]!;
state.effects.push({
  id: "eff-" + (state.effects.length + 1) + "-" + idSuffix(ports, 4),
  kind: "butler",
  sourceId: actor.id,
  targetId: targets[0]!,
  start: at,
  expires: { phase: "night", number: at.number + 1 },
  active: !impaired,
});
```

Three facts matter for a behavior-preserving move:

1. The master is written on the seat in both cases. This is the MASTER
   reminder of Butler r3120 ("They point at any player. Mark this player with
   the MASTER reminder token"), and the command path reports it as
   `player.butler_master_changed`.
2. An impaired choice still pushes an effect and draws its id, with
   `active: false`. The record stays inactive after the Butler recovers, so a
   wasted use has no effect later (States r1039).
3. An earlier `butler` effect is not ended. It expires by its own date, one
   dusk after it was made.

## Master record intent

```ts
| { readonly kind: "record-master"; readonly playerId: string }
```

The engine writes `butlerMasterId` on the acting seat. The intent names no
seat to write on, so a role cannot record a master for another player. It is
a reminder of the choice and not the restriction: the vote check reads the
dated effect through `butlerMaster`, never the field.

A generic "remember a value on the seat" intent was considered and not added.
It would have one consumer and an open key, and ADR 0002 grows the union only
with a migrated role and names an intent by its mechanic.

## A suppressed dated effect

The Butler needs the same dated effect on both paths, working or wasted. Two
shapes were possible:

- a flag on the intent (`wasted: true`) that the role sets beside
  `suppressed`;
- one rule in the coordinator: a `timed-effect` returned on the `suppressed`
  path is kept as a record that never applies.

The second is used. The decision kind already says whether the ability
worked, so a flag would repeat it and allow two contradictions: a working
effect behind a suppressed ability, or a wasted effect behind a working one.
With the rule in the coordinator neither can be written.

On the `suppressed` path the coordinator therefore:

- pushes the effect with the same id scheme and the same draw from the
  command ports, and `active: false`;
- skips `replacesPrevious`: a failed ability ends nothing.

The second point has no role consumer yet (the Butler does not replace). It
is covered by a coordinator test with a stub module, because the opposite
default would let a later role end a working effect with a failed choice.

`record-master` is applied on both paths. The other intents are applied as
before; the Pukka's `suspend-death` on the suppressed path is unchanged.

## Role

Butler (r3120), timing `any`, step `{ target: "one-other" }`:

- a choice returns `record-master` and one `butler` effect that expires at
  the next dusk (`night n + 1`), so it covers tomorrow's votes;
- healthy: `effects` with `note.butlerMaster`;
- impaired: `suppressed` with the same two intents, and the engine's generic
  failure note, as the branch wrote.

The Butler does not set `replacesPrevious`, matching fact 3.

Target validation stays in the engine: "not yourself" is the shared
`one-other` check that returns `error.40` before the resolver runs.

## Not in this change

- The vote check in `day.ts` and `butlerMaster` in `effects.ts` still name
  the role. They are a shared mechanic that reads the effect graph, not a
  night step, and ADR 0002 has no vote arm. The ledger shows the Butler as a
  typed capability with engine references.
- `butlerMaster` keeps its own impairment check at vote time.
- The Imp attack and the information roles are later pull requests of the
  same slice.

## Compatibility and proof

No storage, command, journal, schema or pin changes.

1. Seven characterization tests were added to `engine.test.ts` and run on the
   untouched branch: the master record, the effect, step and log records, the
   draw order on the command ports, the earlier record left alone, the
   inactive record of an impaired choice, a choice made while impaired that
   does not bind a healthy Butler, the self-target rejection, the command
   events and preview/apply/replay/export on the command path.
2. The same tests pass unchanged after the move.
3. A seeded driver played 200 games per edition through `applyCommand` on
   main and on this change, hashing the full serialized state and every
   command result. All 600 digests are equal. The games contain 252 Butler
   choices, 13 of them made while impaired.

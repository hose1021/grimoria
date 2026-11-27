# Design

## Contract

The `night-step` arm follows ADR 0002:

```ts
| {
    readonly kind: "night-step";
    readonly timing: "first" | "other" | "any";
    readonly step: NightStepSpec;
    readonly resolve?: (context: AbilityContext) => AbilityDecision;
  }
```

- `step` is the existing `NightStepSpec`, unchanged.
- `resolve` receives the `AbilityContext` of ADR 0001 and returns its
  `AbilityDecision`. ADR 0002 sketches a `NightContext` with a separate
  `timing` fact; it is not added, because `at.number` already carries it and
  no migrated rule reads it. An arm without `resolve` only declares the step
  and leaves the completion to the engine.
- `timing` replaces the pair of legacy fields. `any` is one shape for every
  night the role wakes (legacy `nightStep` alone). `first` and `other` split a
  role whose first night differs (legacy `firstNightStep` beside
  `nightStep`). `other` alone is a role that does not act on the first night.

`AbilityContext.nameOf` returns the seat name, as `DeathContext` and
`TransformationContext` already do. The two rule notes carry the target's name
in their variables and fallback text, and the context had no way to read it.

## Dated effect intent

```ts
| {
    readonly kind: "timed-effect";
    readonly effect: "poison" | "protected";
    readonly playerId: string;
    readonly expires: DeadAt;
    readonly replacesPrevious?: boolean;
  }
```

The intent names the mechanic (an entry of the effect graph) and the target.
The engine owns the rest: the source is the acting seat, the start is the
current night, and the id is `eff-<n>-<suffix>` with the suffix drawn from the
command ports, exactly as the removed branches built it. `replacesPrevious`
first sets `active = false` on every effect of the same kind sourced by the
actor, which is what both branches did.

The existing `poison` intent is the Pukka's indefinite poison with its own id
scheme and marker in `engine/pukka.ts`. It is left alone; overloading it with
an optional expiry would have hidden two different mechanics behind one name.

The same shape (a source-owned dated effect with a port-minted id) is written
in seven more places in `bmr.ts` and `day.ts`: Sailor, Innkeeper (twice),
Devil's Advocate, Courtier and Minstrel. Those roles can reuse the intent
when they migrate; the kind union grows with each one.

## One lookup

`src/core/roles/night-step.ts` exports `firstNightStepOf`,
`otherNightStepOf`, `nightStepFor(module, night)` and
`nightResolverFor(module, night)`.

- A module with a `night-step` arm is read from its arms only: the first
  night uses the `first` arm, else `any`; later nights use `other`, else
  `any`.
- A module without one is read from the legacy fields with the same
  expression every call site used: `firstNightStep ?? nightStep` on the first
  night, `nightStep` otherwise, and the legacy `ability` as the resolver.

Nine call sites move to the lookup: two in `night.ts`, four in `bmr.ts`
(including the Lunatic mask and the Grandmother's death step, which read the
other-night shape on purpose) and three in `sv.ts` (including the
Philosopher's first-night ability chosen on a later night). No call site reads
a legacy field directly any more, so a later migration cannot leave one
behind.

`night-step.test.ts` keeps two rules over the whole registry: a module never
declares a night step in both forms, and an arm's timing agrees with the
printed night order of its edition. Without the second rule a wrong timing
would silently drop a step from the queue.

## Coordinator

`applyRoleAbility` asks the lookup for the resolver of the current night
instead of reading `module.ability`. The Bad Moon Rising completion keeps its
dispatch with the new condition, so the Gambler and the Pukka are unaffected.
The Trouble Brewing completion gains the same dispatch before its role
branches, followed by the shared `finishStep`: a module with a resolver never
falls through to a branch.

Target validation stays where it is. The Monk's "not yourself" is the shared
`one-other` check that returns `error.40` before the resolver runs.

## Roles

- Poisoner (r1737), timing `any`: a healthy choice returns one `poison`
  effect that expires at the next dusk (`night n + 1`) and replaces the
  earlier one, with `note.poisoned`. Impaired returns `suppressed`.
- Monk (r3124), timing `other`: a healthy choice returns one `protected`
  effect that expires at dawn (`day n`) and replaces the earlier one, with
  `note.protected`. Impaired returns `suppressed`.

A Drunk shown the Monk takes the Monk step as before: the step carries the
shown role, the actor is the Drunk, and the impairment fact suppresses the
ability.

## Not in this slice

The Butler branch records the chosen master on the player and pushes an
inactive effect even when the Butler is impaired. The `suppressed` decision
does not model a recorded choice with an inactive effect, and changing that
shape is a decision for its own review. The Imp attack (Mayor redirect, own
log line) and the information roles are later slices of the same ADR row.

## Compatibility and proof

No storage, command, journal, schema or pin changes.

1. Nine characterization tests were added to `engine.test.ts` and run on the
   untouched branches. They pin the effect, step and log records, the draw
   order on the command ports, replacement, the impaired path, the Drunk mask
   and preview/apply/replay/export on the command path.
2. The same tests pass unchanged after the move.
3. A seeded driver played 200 games per edition through `applyCommand` on the
   base commit and on this change, hashing the full serialized state and every
   command result. All 600 digests are equal.

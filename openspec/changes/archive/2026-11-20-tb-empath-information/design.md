# Design

## What the engine did

The module already held the count. The engine held everything around it:

```ts
// information.ts, infoForStep
if (role === "empath") {
  const module = roleModule("empath");
  const decision = module && resolveInformationCapability(module, { ...facts });
  const value =
    decision?.kind === "answer" && typeof decision.value === "number"
      ? decision.value
      : empathCount(state, actor ? actor.id : "", registrations);
  return {
    kind: "number",
    value,
    impaired,
    needsChoice: impaired,
    options: impaired ? [0, 1, 2] : [],
  };
}
```

```ts
// night.ts
infoKindFor: { ..., empath: "number", ... }       // the shape of the step
if (role === "chef" || role === "empath" || ...)  // the completion gate
```

Four facts matter for a behavior-preserving move:

1. **The answer has a shape and a range.** The step shows a number, and the
   number is 0, 1 or 2 (Empath r1724, "How to Run": "Show them fingers (0, 1,
   or 2)"). Both are facts of the role, and both were written in the engine.
2. **Impairment is the engine's fact.** `isImpaired` at the date of the night
   decides whether the computed number is the answer or the host is asked
   (States r1039: "a drunk Empath still wakes each night and gets shown a
   finger signal, but you can show the wrong number of fingers"). The role
   computed the same count either way.
3. **The host question changes nothing.** An impaired step without an answer
   returns the question and the options, and writes nothing. An answer that
   was not offered is rejected with `error.66`.
4. **The stored answer is part of the record.** A healthy step stores the
   whole answer object as `given`, with its keys in the order `kind`, `value`,
   `impaired`, `needsChoice`, `options`; an impaired step stores what the host
   sent and journals it as false information after the step line. Saved games
   and replays hold these bytes.

## Possible answers on the `answer` decision

```ts
export type InformationValue = boolean | number | string;

| {
    readonly kind: "answer";
    readonly value: InformationValue;
    readonly possible?: readonly InformationValue[];
  }
```

The role returns what its ability learns and every value that answer can
take. It returns the same decision whether or not its owner is impaired. The
engine then decides:

- a working ability shows `value`, and the host is offered nothing;
- for an ability that does not work, the engine asks the host and offers
  `possible`. The true value stays among them, because false information is
  the host's option, not a duty (States r1039, Drunk r3165).

`possible` is a field of the answer, not a second decision:

- ADR 0002 lists `answer`, `options`, `host-choice` and `note` for an
  information step. An `options` decision would make the role choose between
  two decisions by reading `impaired`, which is fact 2 moved into the role. A
  role that reads no impairment cannot answer for a drunk owner by mistake.
- The range does not depend on the game. A role that has more to say about a
  false answer (a Chef's range under registration, a pair of players) brings
  its own addition with its own move, as ADR 0002 requires.

The type of `value` does not change: a boolean, a number or a string, the
shapes a yes or no, a count and a character answer need. `possible` holds the
same kind of values. The Empath is the only module with an `information`
capability, so no other role is affected.

## The step shape is declared with the step

The Empath declares its step through the `night-step` capability, like the
roles moved before it: timing `any`, no target and `infoKind: "number"`. It
has no resolver, because the step changes nothing in the game; the lookup
then reports no resolver and the completion goes on to the information gate.

`makeRoleStep` reads `infoKind` from the declared step and falls back to the
`infoKindFor` table, which loses its Empath entry. No other Trouble Brewing
module declares an `infoKind`, so every other step is built as before.

The capability's own `infoKind: "empath"` is the name of the answer inside the
module (a module may answer more than one question later). The shape the host
sees comes from the step, so the two are not the same word.

## One engine path for a role that owns its answer

`moduleInfoForStep` in `information.ts` replaces the Empath branch. It takes
the module as an argument, so the engine tests drive it with a stub module
that answers yes or no and prove that it holds no fact of the Empath:

- no `information` capability: `null`, the engine keeps its own path;
- `no-effect`: no information;
- `answer`: the declared shape, the role's value, the engine's `impaired`,
  the host question when impaired, and a copy of the role's possible answers
  only when impaired.

`infoForStep` calls it before the role branches, and `completeStep` enters the
information gate for any module that declares the capability. The lookup
`informationOf` in `src/core/roles/night-step.ts` is the one place that reads
the declaration, next to the lookups of the step and the resolver.

The fallback to `empathCount` is removed with the function. It ran only when
the module returned no number, which the Empath module never does, so it was
an engine copy of the rule that could drift from it.

## Role

Empath (r1724), timing `any`, step `{ infoKind: "number" }`:

- the count of the two nearest living neighbours whose registered team is
  evil, as before;
- `possible: [0, 1, 2]`.

A Spy or a Recluse counts as the team the engine reports through
`registeredTeamOf` (Spy r3118, Recluse r3007). The engine applies only a
registration the host chose for a registrant that is sober and healthy, as
before; the role never sees the registrations.

## Record quirks kept on purpose

These are bytes of saved games and replays. This change does not alter them,
and each would be its own reviewed change:

- a healthy step stores an answer the host sends in place of the computed
  one, without checking it against any list and without a journal line;
- targets sent with the step are stored on it, although the step takes none;
- the step line is the shared "Шаг выполнен." under the role's catalog name;
- the unanswered question carries no error code, and the rejected answer
  carries `error.66` with the Russian sentence.

## Not in this change

- The other Trouble Brewing information roles keep their branches in
  `infoForStep`, their rows in `infoKindFor` and their names in the gate.
- `alignmentOf`, `aliveNeighbors` and `isImpaired` are the shared mechanics
  the context reads; they are untouched.
- The table screen still names the Chef and the Empath when it offers the
  registration prompt (`src/ui/screens/table/cards.tsx`).
- The `step-kind-capabilities` requirement "A role module declares its
  information rule" still describes the capability. It says the engine keeps
  the step shape; for a moved role the module now declares the shape and the
  engine builds the step from it. The requirements added here state that.

## Compatibility and proof

No storage, command, journal, schema or pin changes.

1. Ten characterization tests were added to `engine.test.ts` and run on the
   untouched branch: the step as built on the first and on a later night; the
   full step and log records and the draw order of a healthy step; an answer
   sent to a healthy step; the host question that changes nothing; the host's
   2 and the host's 0 as false information; the journaled registration before
   the step line; a Drunk shown the Empath; preview, apply and replay on the
   command path; and the host choice on the command path.
2. The same tests pass unchanged after the move.
3. A seeded driver played 200 games per edition through `applyCommand` on
   main and on this change, hashing the full serialized state and every
   command result. All 600 digests are equal. The driver leaves one in five
   host questions unanswered once and answers it once with a value that was
   not offered before it answers, and sends registrations on any step.

# Design

## What the engine did

```ts
// spy/role.ts
nightStep: {},
capabilities: [{ kind: "adjudication", case: "registration", options: ["good"] }],
```

```ts
// night.ts
export function infoKindFor(roleId) {
  return { spy: "grimoire" }[roleId || ""] || "none";
}
// makeRoleStep
infoKind: declared?.infoKind ?? infoKindFor(roleId),
// completeStep, after the gate of the roles that own their answer
if (role === "spy") {
  step.given = { kind: "grimoire" };
  return finishStep(state, step, options, targets, at, ports);
}
```

```ts
// information.ts, infoForStep, after the module path
if (role === "spy") {
  return { kind: "grimoire" };
}
return { kind: "none" };
```

Six facts matter for a behavior-preserving move:

1. **The step exists on every night.** "Each night, wake the Spy and show them
   the Grimoire for as long as they need" (r3118, "How to Run"). The printed
   order lists the Spy last on the first night and on the other nights.
2. **Nothing is computed.** The record of the step is `{ kind: "grimoire" }`
   and nothing else. The table reads it as a hint to show the Grimoire
   without commentary.
3. **Nothing is asked and nothing is stored in its place.** The branch wrote
   the record itself and never read `options.given`, so an answer sent with
   the step was ignored, whatever its shape.
4. **An impaired Spy has the same record.** The step is marked as impaired by
   the shared end of a step, the table warns the Storyteller to show a false
   Grimoire, and no question is asked. The app cannot build a false Grimoire.
5. **The shared end of a step runs as for any step.** Players sent with the
   step are stored as sent; the Spy's own registration sent with the step is
   journaled before the step line; a redirect sent with the step is journaled
   as a Mayor redirect. A registration for a player who has none is refused
   before the step is read.
6. **A dead Spy has no step.** A Spy killed at night before its step has the
   step closed with the note of a dead actor, and does not wake later.

## One decision: the ability shows the Grimoire

```ts
/**
 * The ability shows the Grimoire itself. Nothing is computed and nothing is
 * asked: the engine records that the Grimoire was shown, also for an owner
 * who is drunk or poisoned, and stores no answer in its place. What a
 * Storyteller shows an impaired owner is done at the table.
 */
| { readonly kind: "grimoire" }
```

The module:

```ts
capabilities: [
  { kind: "night-step", timing: "any", step: { infoKind: "grimoire" } },
  {
    kind: "information",
    infoKind: "spy",
    resolve() {
      return { kind: "grimoire" };
    },
  },
  { kind: "adjudication", case: "registration", options: ["good"] },
],
```

One other form was weighed.

*No information capability, the shape on the step alone.* The module would
declare `step: { infoKind: "grimoire" }` and the engine would write the record
for any step of that shape. It is one line shorter in the module. It was
refused for three reasons. The engine would keep a branch on a shape in
`infoForStep` and in the step completion, which is the table this slice
removes under another key. The record would follow the shape of the step and
not the role, so a state whose step names another role with that shape would
answer differently from before. And the eight information roles moved so far
answer through one path, `moduleInfoForStep`; a ninth that answers beside it
would be the exception the next reader has to learn.

With the decision, the answer of the Spy is where the answer of every moved
role is, and the engine reads what the role said. The shape on the step stays
what it was for the other roles: a declaration the table reads.

`grimoire` carries nothing. A value would be a claim that something was
learned, options would be a question, and a text would be a sentence the
engine stores. The Grimoire is none of them: it is shown. Compile-time checks
reject a `grimoire` decision with a value, with possible values, with a text
and with a mark of impairment.

The module reads no fact. The role tests call the resolver with a context
that fails the test on any read, `impaired` included. That the decision is
the same for an impaired owner is the rule of every information role in this
contract: impairment is the engine's.

## The engine

`moduleInfoForStep` returns `{ kind: "grimoire" }` for the decision, before
the shape of the step is looked at. The record is a new object on every call
and has no `impaired`, `needsChoice` or `options` key, as before.

The gate of the step completion already covers every role that owns its
answer. For a Grimoire record it stores the record and ends the step, without
`validateGiven`:

```ts
if (info.kind === "grimoire") {
  // The Grimoire is shown, not told. No answer can stand in its place, so
  // one sent with the step is not stored.
  step.given = info;
  return finishStep(state, step, options, targets, at, ports);
}
```

`validateGiven` would store an answer sent with the step in place of the
record (fact 3), so the Grimoire does not go through it. This is the one
place where the completion reads the kind of a record. It is a property of
the record, not the name of a role: any module that returns the decision gets
the same handling, and two tests with a stub module say so.

`infoForStep` ends with the module path and `{ kind: "none" }`. `infoKindFor`
is removed; `makeRoleStep` reads the declared shape and falls back to
`"none"`. The legacy `nightStep: {}` and the arm `timing: "any"` give the same
steps: `nightStepFor` returned the legacy step on every night.

## Record quirks kept on purpose

These are bytes of saved games and replays. This change does not alter them,
and each would be its own reviewed change:

- an answer sent with the Spy's step is accepted and not stored, without a
  refusal;
- players sent with the step are stored on it, although the step takes none;
- a redirect sent with the step is journaled as a Mayor redirect by the
  shared end of a step, as for any step, and the step itself keeps none;
- the record of an impaired Spy does not say that the Grimoire shown was
  false: the step's `impaired` mark is the only trace.

## Not in this change

- The registration of the Spy: the `adjudication` capability, the engine code
  that applies it and the checks of setup and of the day keep naming the
  role.
- The table screen (`cards.tsx`, `helpers.ts`, the Grimoire dialog): the
  button and the warning are offered by the role's id.
- `validateGiven`, `finishStep` and the journal of a host choice: the shared
  mechanics of a step are untouched.
- The information roles of Bad Moon Rising and Sects and Violets, and the
  wake hooks of the Undertaker and the Ravenkeeper.

## Compatibility and proof

No storage, command, journal, schema or pin changes.

1. Eight characterization tests were added to `engine.test.ts` and run on the
   untouched engine: the step as built on three nights; the step and log
   records of a completed step on the first and on the second night with the
   draws from the command ports; an answer of three shapes sent with the step;
   a poisoned Spy; the Spy's own registration and another player's; a Spy
   killed by the Demon; and preview, apply and replay on the command path.
2. The same tests pass unchanged after the move, and so do the older tests of
   the Spy's registration.
3. A seeded driver played 200 games per edition through `applyCommand` on
   main and on this change, hashing the full serialized state and every
   command result. All 600 digests are equal. The driver leans Trouble Brewing
   bags toward a Spy and the poison toward it, and sends with the Spy's step
   an answer of seven shapes, players, a redirect, the Spy's own
   registration, another player's and a value that is no registration.
4. Thirty-nine single mutations of the module, of `moduleInfoForStep`, of
   `infoForStep` and of the step completion were made and reverted; each
   fails at least one test. Two passed at first and showed facts no test
   pinned; two tests were added and run on the untouched engine as well. A
   part of the mutations was replayed through the driver; `tasks.md` holds
   the counts.
5. Compile-time checks reject a `grimoire` decision that carries a value,
   possible values, a text or a mark of impairment.
6. The ownership ledger test pins the Spy's row: the three capabilities and
   the engine references of its registration.
7. The step was checked at 390 px with four real games: a healthy Spy and a
   poisoned Spy, on the first and on the second night.

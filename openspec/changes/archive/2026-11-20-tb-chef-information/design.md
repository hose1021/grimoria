# Design

## What the engine did

```ts
// information.ts
export function chefCount(state, registrations = {}) {
  // one pair for every seat whose player and the next one around the ring
  // both have alignmentOf(...) === "evil" under the host's registrations
}

function chefRegistrationRange(state) {
  // max: both players of the pair can be evil (really evil, or a sober and
  //      healthy Recluse)
  // min: neither player of the pair can be good (really good, or a sober and
  //      healthy Spy)
}

// infoForStep
if (role === "chef") {
  const value = chefCount(state, registrations);
  const range = chefRegistrationRange(state);
  const registrationChoice = !impaired && range.min < range.max;
  return {
    kind: "number",
    value,
    impaired,
    needsChoice: impaired || registrationChoice,
    options: impaired
      ? uniqueNumbers(0, orderedPlayers(state).length)
      : registrationChoice
        ? uniqueNumbers(range.min, range.max)
        : [],
  };
}
```

```ts
// night.ts
infoKindFor: { ..., chef: "number", ... }   // the shape of the step
if (... || role === "chef" || ...)          // the completion gate
```

Five facts matter for a behavior-preserving move:

1. **The count is the role's rule.** "A pair is two players, but one player
   may be a part of two pairs" (Chef r2510). The pairs run around the ring,
   the last seat beside the first.
2. **A working Chef can need the host.** "Here, the Recluse is registering as
   evil for the Imp-Recluse pair, but as good for the Poisoner-Recluse pair"
   (Chef r2510, Example 4). Each pair registers on its own, so every count
   from the unavoidable pairs to the possible pairs is true for some
   registration. The engine picks none: the host is asked, the answer is
   checked against the range, and it is journaled as a registration ambiguity.
3. **Who may register is the engine's.** A Recluse might register as evil and
   a Spy as good only while sober and healthy (Recluse r3007, Spy r3118,
   States r1039). The range reads that, not the registrations the host sent
   with the step.
4. **The host's registrations move the computed count only.** A registration
   sent with the step changes the `value` the host sees as the computed
   answer. The offered range stays, and the step still waits for the count.
5. **An impaired Chef is offered every number up to the player count**, with
   the range ignored, and the answer is journaled as false information.

## Legal values on the `answer` decision

```ts
| {
    readonly kind: "answer";
    readonly value: InformationValue;
    readonly possible?: readonly InformationValue[];
    readonly legal?: readonly InformationValue[];
  }
```

`legal` is every value a working ability may show when the answer depends on
how a player registers. The role still gives `value`, the answer under the
registrations chosen so far, and still returns the same decision whether or
not its owner is impaired. The engine decides:

- a working ability with at most one legal value shows `value`;
- a working ability with more than one is the host's choice among `legal`;
- an impaired owner is asked and offered `possible`, as before.

The journal case follows from the engine's own fact, as it did: an offered
answer without impairment is a registration ambiguity, and with impairment it
is false information (`caseForStep`).

`legal` is a field of the answer and not the `host-choice` decision of the ADR
table, for the reason `possible` is not an `options` decision: a role that
returned another decision for an ambiguous count would have to return the
plain one for an impaired owner, and would read `impaired` to choose. With a
field the role states what is true and the engine alone decides who answers.

The Undertaker and the Ravenkeeper have the same case (a Spy or a Recluse may
register as another character to them), so the field is not the Chef's alone.

## Two facts on the information context

```ts
/** Every seat in order around the circle, living or dead. */
readonly seatIds: readonly string[];
/**
 * Whether the player may register as this team to this ability: their own
 * team, or the other one while the Storyteller may still register them so.
 */
mayRegisterAs(playerId: string, team: "good" | "evil"): boolean;
```

`seatIds` is a copy of the seat order. The Chef counts dead players as it did
(the engine never filtered them; the Chef acts on the first night).

`mayRegisterAs` is the two predicates of `chefRegistrationRange` behind one
question. It answers from the real team and from the registrant's own state,
not from the registrations of the step, which is fact 3. The role does not
name the Spy or the Recluse and does not read impairment: which characters
may register as what, and when, stays in the engine.

`registeredTeamOf`, which the Empath reads, is the team under the host's
registrations and gives the computed count (fact 4).

## Role

Chef (r2510), timing `first`, step `{ infoKind: "number" }`, no resolver:

- `value`: the number of seats whose player and the next one around the ring
  both register as evil;
- `possible`: every number from 0 to the seat count;
- `legal`: every number from the pairs in which neither player may register
  as good to the pairs in which both may register as evil.

The legacy `nightStep: {}` applied to any night, and the Chef woke on the
first one only because the night order lists it there. The declaration now
says `first`, which is the rule ("You start knowing"); the queue is built from
the same order, so the steps are the same.

## The query stays, without the rule

`chefCount` is exported from the engine index and two tests call it on games
without a Chef step. It keeps its signature and resolves the module's
capability with the engine's facts, like `fortuneTellerYes`. This leaves one
reference to the role in `information.ts`.

`chefRegistrationRange` is removed: the role computes the range.
`uniqueNumbers` had no other caller and is removed with it.

## Record quirks kept on purpose

These are bytes of saved games and replays. This change does not alter them,
and each would be its own reviewed change:

- a healthy step without a range stores an answer the host sends in place of
  the computed one, of any shape, without a check and without a journal line;
- the host's answer is stored as it was sent, so `{ value: 1 }` without a
  `kind` stays that way;
- a registration sent with a step that has a range is journaled although the
  answer is the host's count;
- targets sent with the step are stored on it, although the step takes none;
- the unanswered question carries no error code, and the rejected answer
  carries `error.66` with the Russian sentence.

## Not in this change

- The table screen names the Chef and the Empath when it offers the
  registration prompt (`src/ui/screens/table/cards.tsx`).
- The other Trouble Brewing information roles keep their branches.
- `alignmentOf` and `registrationApplies` are the shared mechanics the context
  reads; they are untouched.

## Compatibility and proof

No storage, command, journal, schema or pin changes.

1. Twenty characterization tests were added to `engine.test.ts` and run on the
   untouched branch: the step as built on the first night only; the count
   around the ring; the step and log records and the draw order of a healthy
   step; an answer sent to a healthy step; the host question of an impaired
   Chef and of a registration range, each changing nothing; the host's answer
   as false information and as a registration ambiguity; a registration that
   moves the computed count and not the range; a Spy alone and a Spy with a
   Recluse; a poisoned Recluse; an impaired Chef beside a Recluse; a Drunk
   shown the Chef; preview, apply and replay on the command path; and both
   host choices on the command path.
2. The same tests pass unchanged after the move, and so do the older Chef
   tests and the tests that call the query.
3. A seeded driver played 200 games per edition through `applyCommand` on
   main and on this change, hashing the full serialized state and every
   command result. All 600 digests are equal. The driver leans Trouble Brewing
   games toward a Chef, a Spy and a Recluse and the first night's poison
   toward the Chef and the registrants.

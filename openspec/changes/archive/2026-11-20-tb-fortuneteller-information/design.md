# Design

## What the engine did

```ts
// information.ts
export function fortuneTellerYes(state, targetIds, registrations = {}) {
  const herringId = state.setup && state.setup.herringId ? state.setup.herringId : state.herringId;
  return (targetIds || []).some((id) => {
    const player = playerById(state, id);
    if (!player) return false;
    if (id === herringId) return true;
    return registersAsDemon(state, player, registrations);
  });
}

// infoForStep
if (role === "fortuneteller") {
  const value = fortuneTellerYes(state, options.targetIds || step.targetIds, registrations);
  return { kind: "yes-no", value, impaired, needsChoice: impaired, options: impaired ? [true, false] : [] };
}
```

```ts
// night.ts
infoKindFor: { ..., fortuneteller: "yes-no", ... }   // the shape of the step
if (... || role === "fortuneteller" || ...)          // the completion gate
```

Four facts matter for a behavior-preserving move:

1. **The rule is one sentence over two facts.** "If either chosen player is a
   Demon or the Red Herring, nod your head yes" (Fortune Teller r3123). Who
   registers as a Demon and who the red herring is are facts of the game; the
   "either" is the role.
2. **Registration is the engine's.** A Demon registers as one, alive or dead.
   A Recluse registers as the Demon only when the host said so for this step
   and the Recluse is sober and healthy (Recluse r3007). A Spy cannot register
   as a Demon, and such an answer is refused with `error.67` before the step
   is completed.
3. **The targets are checked before the answer.** The shared `two` check
   returns `error.41` without two players, `error.42` for the same player
   twice and `error.31` for a seat that does not exist. A dead player and the
   Fortune Teller's own seat are legal.
4. **The stored answer is part of the record.** A healthy step stores the
   whole answer object with its keys in the order `kind`, `value`, `impaired`,
   `needsChoice`, `options`; an impaired step stores what the host sent and
   journals it as false information after the step line, with "да" or "нет" as
   the detail.

## Two facts on the information context

```ts
/** A Demon, alive or dead, or a player the host registered as one for this step. */
registersAsDemon(playerId: string): boolean;
/** The good player chosen in setup as the red herring, if the game has one. */
readonly redHerringId: string | null;
```

`registersAsDemon` is the existing engine function behind a closure that
holds the step's registrations, like `registeredTeamOf`. The role never sees
the registrations, so it cannot apply one the host did not choose or one of a
drunk Recluse.

`redHerringId` is read the way the engine read it: the setup secret first,
then the top-level field. The role compares ids; it does not learn why that
player is the herring. The fact is on the shared context and not a field of a
Fortune Teller context, because the capability has one context type and ADR
0002 adds a fact with the role that first reads it. The Empath does not read
either fact.

A single fact, "registers as a Demon to the Fortune Teller", was considered:
the engine would fold the herring into the registration. It was not used,
because then the engine would still hold half of the role's sentence, and the
Slayer and the Ravenkeeper, which also read Demon registration, do not have a
herring.

## Role

Fortune Teller (r3123), timing `any`, step
`{ target: "two", infoKind: "yes-no" }`, no resolver:

- yes when either chosen player exists and is the red herring or registers as
  a Demon; no otherwise, also when no player is chosen yet;
- `possible: [true, false]`, in the order the host was offered them.

The role returns the same answer for an impaired owner. The engine path added
by `tb-empath-information` asks the host and offers the possible answers.

## The query stays, without the rule

`fortuneTellerYes` is exported from the engine index and four engine tests
call it on games that have no Fortune Teller step, to ask what a Fortune
Teller would hear. It stays with the same signature and now resolves the
module's capability with the engine's facts (`informationFacts`, the builder
`moduleInfoForStep` uses), so the rule has one owner. It asks as a working
ability: the query never took the owner's impairment into account.

This leaves one reference to the role in `information.ts`. Removing the query
would mean rewriting those tests, which a behavior-preserving change does not
do.

## Record quirks kept on purpose

These are bytes of saved games and replays. This change does not alter them,
and each would be its own reviewed change:

- a healthy step stores an answer the host sends in place of the computed
  one, of any shape, without a check and without a journal line;
- the answer shown before two players are chosen is computed from the players
  chosen so far;
- the unanswered question carries no error code, and the rejected answer
  carries `error.66` with the Russian sentence.

## Not in this change

- `setup.ts` still names the role where the red herring is validated and
  chosen automatically. That is setup, not the night step.
- The table screen names the Fortune Teller when it offers the Recluse's
  Demon registration (`src/ui/screens/table/cards.tsx`), and the secrets
  screen when it asks for the herring.
- The other Trouble Brewing information roles keep their branches.

## Compatibility and proof

No storage, command, journal, schema or pin changes.

1. Twelve characterization tests were added to `engine.test.ts` and run on
   the untouched branch: the step as built on the first and on a later night;
   the answers for the Demon, the red herring, the Fortune Teller's own seat,
   a Minion and a missing seat; the step and log records and the draw order
   of a healthy step; the target errors that change nothing; an answer sent
   to a healthy step; the host question that changes nothing; the host's yes
   and no as false information; a Recluse registered as the Demon, as evil
   only, and a refused Spy registration; a Drunk shown the Fortune Teller;
   preview, apply and replay on the command path; and the host choice on the
   command path.
2. The same tests pass unchanged after the move, and so do the four older
   Fortune Teller tests and the tests that call the query.
3. A seeded driver played 200 games per edition through `applyCommand` on
   main and on this change, hashing the full serialized state and every
   command result. All 600 digests are equal. The driver leans the Fortune
   Teller toward the Demon, the red herring, the Recluse and dead players.

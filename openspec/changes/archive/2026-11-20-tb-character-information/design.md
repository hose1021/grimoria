# Design

## What the engine did

```ts
// information.ts, infoForStep
if (role === "undertaker") {
  const death = executionDeathForDay(state, nightAt(state).number - 1);
  if (!death) return { kind: "none", text: "Сегодня казни со смертью не было." };
  const choices = characterChoices(state, death.playerId, impaired);
  return {
    kind: "character",
    roleId: death.roleId,
    playerId: death.playerId,
    impaired,
    needsChoice: impaired || choices.length > 1,
    options: choices,
  };
}

if (role === "ravenkeeper") {
  const targetId = (options.targetIds || step.targetIds || [])[0];
  const target = targetId ? playerById(state, targetId) : null;
  if (!target)
    return { kind: "character", roleId: null, needsChoice: true, options: ALL_ROLES.slice() };
  const choices = characterChoices(state, target.id, impaired);
  return { kind: "character", roleId: target.roleId, playerId: target.id, impaired,
           needsChoice: impaired || choices.length > 1, options: choices };
}

export function characterChoices(state, targetId, actorImpaired = false) {
  // impaired owner: every character
  // a drunk or poisoned Spy or Recluse: its own character
  // a Recluse: its own character, then every Minion and Demon
  // a Spy: its own character, then every Townsfolk and Outsider
  // anybody else: their own character
}
```

```ts
// night.ts
infoKindFor: { ..., undertaker: "character", ravenkeeper: "character", ... }
if (role === "ravenkeeper") { /* validateGiven, finishStep, recordPending */ }
if (role === "undertaker") { /* the same four lines */ }
```

Six facts matter for a behavior-preserving move:

1. **The answer is a character of one player.** The Undertaker reads the
   character written on the death record, which is what the player was when
   executed ("the Undertaker learns a player's true character", Undertaker
   r3115, Example 2, so an executed Drunk is the Drunk). The Ravenkeeper reads
   the character of the chosen seat, alive or dead (Ravenkeeper r3125).
2. **A working ability can need the host.** "The Undertaker is shown the
   Butler token, because the Spy is registering as the Butler" (Undertaker
   r3115, Example 3). "The Ravenkeeper learns that Douglas is the Scarlet
   Woman, since the Recluse registered as a Minion" (Ravenkeeper r3125,
   Example 2). The engine picks none: the host is asked, the answer is checked
   against the list, and it is journaled as a registration ambiguity.
3. **Who may register as what is the engine's.** A Recluse may be shown as a
   Minion or a Demon and a Spy as a Townsfolk or an Outsider, only while sober
   and healthy (Recluse r3007, Spy r3118, States r1039).
4. **An impaired owner is offered every character**, with the registration
   ignored, and the answer is journaled as false information.
5. **The record lists the characters also when there is one.** A healthy step
   about an ordinary player stores `options: ["chef"]` and `needsChoice:
   false`. The number and yes or no records store an empty list in that case.
6. **Before a player is chosen the Ravenkeeper's step is a question with every
   character.** The table hides it until a player is chosen, and the step
   completion refuses the step first (`error.39`, `error.31`), so it is a
   preview record and never a stored one.

## Two facts on the information context

```ts
/**
 * The player who died by execution today and the character recorded at the
 * death. Null when no execution caused a death today.
 */
readonly executedToday: { readonly playerId: string; readonly roleId: RoleId | null } | null;
/**
 * The characters the player may register as to this ability, their own
 * first: more than one only while the Storyteller may still register them
 * as another character.
 */
mayRegisterAsCharacters(playerId: string): readonly RoleId[];
```

`executedToday` is `executionDeathForDay` for the day before the night of the
step, reduced to the two fields the rule reads. The list of deaths, with its
causes and times, stays out of the context.

`mayRegisterAsCharacters` is `characterChoices` without its third argument.
It answers from the player's own character and state (fact 3). The owner's
impairment does not widen it: what an impaired owner is offered is the
engine's decision, from the values the role names as possible (fact 4). The
role does not name the Spy or the Recluse.

The Chef's `mayRegisterAs` asks about a team. A character is a different
question: a Recluse may be shown as the Imp to the Undertaker, and that says
more than "may register as evil". The two facts stay apart, and the compile
check that a role asks `mayRegisterAs` about a team stays.

## The answer names its player, and a role may have nothing to learn

```ts
| {
    readonly kind: "answer";
    readonly value: InformationValue;
    readonly possible?: readonly InformationValue[];
    readonly legal?: readonly InformationValue[];
    readonly subjectId?: string;
  }
| { readonly kind: "note"; readonly text: string }
| { readonly kind: "no-effect" };
```

`subjectId` is the player the answer is about. The engine writes it into the
record of a character step (`playerId`), which the table and the journal
already read. The role cannot write the record's field itself; a compile
check covers that.

`note` is the Undertaker's sentence for a step without a death on record. The
engine stores it as the answer of the step and asks nobody, impaired or not.
The decision sketch of ADR 0002 gave a note a `key` beside its text. The
stored record has only the text, so the key is left out until a translated
note needs it; adding it later changes no stored byte.

`no-effect` on a step that declares the `character` shape is fact 6: the
engine returns the question with every character. For every other shape it
stays `{ kind: "none" }`.

## The engine writes the character record

`moduleInfoForStep` reads the declared shape of the step. For `character`:

```ts
const choices = impaired ? [...(decision.possible ?? [])] : [...legal];
return {
  kind: "character",
  roleId: decision.value,
  playerId: decision.subjectId ?? null,
  impaired,
  needsChoice: impaired || choices.length > 1,
  options: choices,
};
```

This is the record of both removed branches, key for key. The one difference
from the number and yes or no records is fact 5: the list is written also
when it holds one character.

## Roles

Undertaker (r3115):

- `value`: the character recorded at the death by execution today;
- `subjectId`: the executed player;
- `possible`: every character of the script catalog;
- `legal`: the characters the executed player may register as;
- no death today: the note "Сегодня казни со смертью не было.".

Ravenkeeper (r3125):

- `value`: the character of the first chosen player;
- `subjectId`: that player;
- `possible` and `legal` as above, for the chosen player;
- no chosen player: no answer.

Both return the same decision whether or not the owner is impaired, and
neither reads `impaired`.

## The wake stays in the legacy step

```ts
// undertaker
nightStep: {
  infoKind: "character",
  actor(state, night) { /* a living Undertaker, after a death by execution */ },
  extra(state, night) { /* executedId, executedRoleId on the step */ },
},
// ravenkeeper
nightStep: {
  target: "one-any",
  infoKind: "character",
  actor(state, night) { /* the Ravenkeeper who died tonight */ },
  extra() { return { actorAlive: false, deadTonight: true }; },
},
```

The earlier slices moved the step declaration to the `night-step` capability.
These two cannot yet: their `actor` and `extra` hooks read the game state,
and a capability never receives it (ADR 0002, "A resolver never receives the
game state"). Eighteen modules have such hooks. A wake that depends on a
death is the subject of ADR slice 6, so this change moves what it can prove
today, the answer, and declares the shape in the place the step is declared.
`nightStepFor` already reads both forms, so the queue and the completion see
one declaration.

The Ravenkeeper's step is appended by `appendConditionalSteps` in `night.ts`
on the night of the death, and `DEATH_TRIGGERED` lists the role. Those four
references stay with the wake.

## Record quirks kept on purpose

These are bytes of saved games and replays. This change does not alter them,
and each would be its own reviewed change:

- a healthy step about a player with one character stores an answer the host
  sends in place of the computed one, without a check, and journals it as a
  registration ambiguity, because the record lists one option;
- the host's answer is stored as it was sent;
- a character registration sent with the step (`{ "2": "minion" }`) is
  refused with `error.67`: the registration of a character is the host's
  answer to the step, not a registration of a team;
- the Undertaker's step carries `executedId` and `executedRoleId`, and the
  Ravenkeeper's `deadTonight`, as before.

## One difference that no game reaches

A seat without a character, or a death record without one, gave a character
record with `roleId: null` and the player. The roles now return no answer for
it, and the engine keeps the question with every character. The setup refuses
a deal with an empty seat, and a death record copies the seat's character, so
no command reaches the case; the 600 driven games did not.

## Not in this change

- The table screen labels a healthy character question with "registration"
  and an impaired one with "false information" (`cards.tsx`); it is untouched.
- The wake hooks and the conditional step, as described above.
- The other Trouble Brewing information roles keep their branches.
- `characterChoices`, `executionDeathForDay` and `isImpaired` are the shared
  mechanics the context reads; they are untouched.

## Compatibility and proof

No storage, command, journal, schema or pin changes.

1. Thirty characterization tests were added to `engine.test.ts` and run on
   the untouched branch: for each role the step as built and when it is not,
   the step and log records and the draw order of a healthy step, an answer
   sent to a healthy step, the host question of an impaired owner and its
   answers as false information, a Recluse and a Spy as the subject, a
   poisoned Recluse, a Drunk shown the role, preview, apply and replay on the
   command path, and both host choices on the command path; for the
   Undertaker also the day it reads, a refused character registration, an
   executed Drunk and the note; for the Ravenkeeper the question before a
   player is chosen and the choice of any player.
2. The same tests pass unchanged after the move, and so do the older tests
   of both roles.
3. A seeded driver played 200 games per edition through `applyCommand` on
   main and on this change, hashing the full serialized state and every
   command result. All 600 digests are equal. The driver leans Trouble Brewing
   games toward an Undertaker, a Ravenkeeper, a Spy and a Recluse, the
   executions toward the registrants, the Imp toward the Ravenkeeper and the
   later nights' poison toward both owners.

# Design

## What the engine did

```ts
// information.ts, infoForStep
if (role === "washerwoman" || role === "librarian" || role === "investigator") {
  const setup = state.setup.info[role];
  if (!setup) {
    if (actor && actor.roleId === "drunk") {
      // a default false answer: the first character of the type and the
      // first two other seats, as a host question
    }
    return { kind: "one-of-two", missing: true, needsChoice: true };
  }
  if ("zero" in setup && setup.zero) {
    if (impaired) {
      // a host question with every Outsider and "zero"
    }
    return { kind: "one-of-two", zero: true, text: "В игре нет Изгоев." };
  }
  // no character or not two players: missing
  return {
    kind: "one-of-two",
    roleId: pairInfo.roleId,
    pair: pairInfo.pair.slice(),
    matchIndex: pairInfo.matchIndex || 0,
    impaired,
    needsChoice: impaired,
    options: impaired ? /* every character of the role's type */ : [],
  };
}
```

```ts
// night.ts
infoKindFor: { washerwoman: "one-of-two", librarian: "one-of-two", investigator: "one-of-two", ... }
if (informationOf(module) || role === "washerwoman" || role === "librarian" || role === "investigator") {
  const info = infoForStep(state, step, options);
  if (info.missing) return { ok: false, needsSetup: true, info, errorCode: "error.44", ... };
  // validateGiven, finishStep, recordPending
}
```

Seven facts matter for a behavior-preserving move:

1. **The answer is not computed.** "While preparing the first night, put the
   Washerwoman's TOWNSFOLK reminder token by any Townsfolk character token,
   and put the Washerwoman's WRONG reminder token by any other character
   token" (r2630, "How to Run"; the same for r1721 and r2983). The Storyteller
   chooses the character and both players before the first night. The app
   keeps that choice in `state.setup.info[role]` and checks it in setup.
2. **The step shows it once.** "They learn this only once and then learn
   nothing more." The step exists on the first night only.
3. **The record is read when the step is read.** The table lets the host fix
   the prepared answer during the night, and the step shows the new one.
4. **Nothing prepared is a request for setup.** No record, no character or
   not two players gives `missing`; the completion refuses the step with
   `error.44` and `needsSetup`, also for a poisoned owner and also when an
   answer is sent with the step.
5. **An impaired owner is offered every character of the role's type.** The
   answer is journaled as false information. The host may also point at other
   players; the pair of the answer is stored as sent.
6. **A Drunk has its own prepared answer.** The night start refuses a Drunk
   shown one of the three roles without a prepared false answer
   (`drunk-info`). A game saved before that check has no record, and for it
   the engine offers a default: the first character of the type and the first
   two other seats.
7. **The zero is written for any of the three roles.** `autoSecrets` and the
   table prepare a zero for the Librarian only, and the night start refuses
   one for a Washerwoman or an Investigator (`info-washerwoman`,
   `info-investigator`). `setSetupInfo` has no phase gate, so a zero written
   after the night began reaches the step, and the engine answers it with
   "В игре нет Изгоев." for either role.

## One decision: the answer is the prepared one

```ts
/**
 * The answer is the one the Storyteller prepared for this ability before the
 * first night: that one of two players is a particular character. The engine
 * reads it from setup and writes the record of the step [...]. The role sees
 * none of it. It names `possible`, every character the answer can show, and
 * the engine offers them when the owner is drunk or poisoned.
 */
| { readonly kind: "prepared"; readonly possible: readonly InformationValue[] }
```

Two other forms were weighed.

*A fact with the prepared answer, returned through `answer`.* The role would
read the character and the pair from its context and hand them back. That is
an echo: no rule is applied to them. It also needs three additions (a fact, a
field for the two players, a list of possible values on a decision without an
answer for fact 6), and it shows a setup secret to a role, which the contract
has refused since the Fortune Teller ("the information context exposes no
setup secrets"; the red herring is named by id only).

*No information capability at all, the type on the step.* The possible values
are a property of the answer, and every other information role names them on
its decision. Keeping them there keeps one place to look.

`prepared` says what is true: the role does not compute this answer. What the
role owns is the sentence of its rule that differs between the three: which
type of character the answer names. `possible` is the same word the other
information roles use for the values an impaired owner may be shown.

The decision carries no character, no players and no zero. Compile-time
checks reject each of them and a decision without `possible`.

## The engine writes the record

`moduleInfoForStep` calls the capability as before and, for `prepared`, calls
`preparedInfo(state, module.id, actor, impaired, decision.possible)`. It is the
removed branch with two changes: the record is read under the id of the module
(the same id as the step's role), and the character type comes from the
decision.

- no record: the default of fact 6 for a Drunk, with `possible` as the options
  and its first value as the character; otherwise `missing`;
- a zero: unchanged, see below;
- no character or not two players: `missing`;
- otherwise the character, a copy of the pair, `matchIndex` from the record,
  and a copy of `possible` as the options of an impaired owner.

`matchIndex` is the Storyteller's mark of which of the two players is the real
one. It is a note of setup and not a part of what the ability learns, so the
engine copies it from the record and the role never sees it.

A prepared answer is one of two players whatever shape the step declares; the
three modules declare `one-of-two`, and setup prepares no other shape.

## The zero does not move

The Librarian's module could own the zero only if the engine stopped writing
it for the other two roles. That is fact 7: today a zero written during the
night for a Washerwoman or an Investigator is answered as zero Outsiders. It
is not a rule (r2630 and r2983 have no zero) and the setup check already calls
such a record incomplete, but it is what the command path does, and a move
does not change behavior. A module-owned zero beside an engine fallback for
the other two roles would be worse than either: the fallback would write the
same record for the Librarian too, so the Librarian's code could be deleted
without a test noticing.

So the zero branch stays in `preparedInfo` as it was, with every Outsider and
both sentences, and a comment that says why. Two tests pin the behavior for
the Washerwoman and the Investigator under the name "kept as found". The
Limitations section of the pull request lists it. Moving the zero to the
Librarian and refusing it for the other two is one small change of its own,
with its own rule check.

## Roles

```ts
capabilities: [
  { kind: "night-step", timing: "first", step: { infoKind: "one-of-two" } },
  {
    kind: "information",
    infoKind: "washerwoman",
    resolve() {
      return { kind: "prepared", possible: ALL_ROLES.filter((id) => roleTeam(id) === "townsfolk") };
    },
  },
],
```

The Librarian filters `outsider` and the Investigator `minion`. The lists are
the lists of the removed branch, in the order of the script catalog: thirteen
Townsfolk with the Washerwoman's own character, four Outsiders with the Drunk
(r1721: "The Drunk is an Outsider"), four Minions.

No module reads a fact. The role tests call each resolver with a context that
fails the test on any read, `impaired` included.

The legacy `nightStep: {}` covered every night; the arm covers the first. The
Trouble Brewing order of the other nights does not list the three roles, so
no step is lost.

## Record quirks kept on purpose

These are bytes of saved games and replays. This change does not alter them,
and each would be its own reviewed change:

- a healthy step stores an answer the host sends in place of the prepared
  one, without a check and without a journal line, because nothing is offered;
- the host's answer is stored as it was sent, with whatever pair it names;
- a record with a character and two entries is shown as it is, also when the
  entries are empty or the mark is out of range: the check of the prepared
  answer is the gate of the night start, not of the step;
- a paired impaired Librarian is not offered the zero, and an impaired
  Librarian with a prepared zero is offered every Outsider and the zero;
- the zero for a Washerwoman or an Investigator, as described above.

## Not in this change

- `secretsErrors`, `autoSecrets`, `normalizeSecrets` and `setSetupInfo`: setup
  keeps its own table of the three roles and their types.
- The table screen (`cards.tsx`, the secrets screen) is untouched.
- The Spy keeps its branch of `infoForStep` and its entry of `infoKindFor`.
- `validateGiven`, `givenIsLegal` and the journal of a host choice are the
  shared mechanics the step completion uses; they are untouched.

## Compatibility and proof

No storage, command, journal, schema or pin changes.

1. Twenty-five characterization tests were added to `engine.test.ts` and run
   on the untouched branch: the three steps as built; for each role the step
   and log records of a healthy step and the question of a poisoned owner
   with its answer as false information; the answer read when the step is
   read; the request for setup for an absent, cleared and half-filled record;
   an answer sent to a healthy step; the zero, healthy and poisoned; a Drunk
   with its prepared false answer and a Drunk with no record, for each role;
   a Drunk shown the Librarian with the zero; a zero written for a
   Washerwoman or an Investigator after the night began; preview, apply and
   replay on the command path; and three host choices on the command path.
2. The same tests pass unchanged after the move, and so do the older tests
   of the three roles and of the Drunk.
3. A seeded driver played 200 games per edition through `applyCommand` on
   main and on this change, hashing the full serialized state and every
   command result. All 600 digests are equal. The driver leans Trouble Brewing
   bags toward the three roles and a Drunk shown one of them, edits the
   prepared answer before the night start and during the first night
   (another pair, a pair with the real player, a cleared character, a zero,
   the mark), repairs a refused night start and a request for setup the way
   a host would, and leans the first night's poison toward the three owners.
4. Sixty-two single mutations of the three modules, of `preparedInfo`, of
   `moduleInfoForStep` and of the step completion were made and reverted;
   each fails at least one test. One of them passed at first and showed a
   missing assertion, which was added. A part of them was replayed through
   the driver; `tasks.md` holds the counts.
5. Compile-time checks reject a context that exposes the prepared answer and
   a `prepared` decision that carries a character, two players, a zero or a
   mark of missing setup, or that names no possible characters.
6. The ownership ledger test pins the three rows: the two capabilities and
   only the references of setup.
7. The three steps were checked at 390 px with eight real games: a prepared
   pair, a poisoned owner, the zero healthy and poisoned, an answer cleared
   and prepared again during the night, and a Drunk shown the Investigator
   and the Librarian.

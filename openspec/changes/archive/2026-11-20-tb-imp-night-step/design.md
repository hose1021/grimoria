# Design

## What the branch did

```ts
const attack = resolveAttack(
  state,
  { attackerId: actor.id, targetId: targets[0]!, at, redirectId: options.redirectId || null },
  ports,
);
if (attack.needsRedirect) return { ok: false, needsRedirect: true, options: attack.options, ... };
step.result = attack;
if (options.redirectId) recordHostChoice(state, "mayor-redirect", ...);
if (attack.noDeath) step.note = attack.reason || "";
else setStepNote(step, "note.impKilled", { name }, "Погиб: " + name + ".");
step.done = true;
step.completedAt = nowIso(ports);
step.given = null;
addLog(state, { secret: true, kind: "night", title: "Имп атакует", detail: step.note, ... }, ports);
appendConditionalSteps(state, ports);
if (attack.pendingInheritance) step.pending = attack.pendingInheritance;
checkWin(state, {}, ports);
return { ok: true, step, result: step.result };
```

Four facts matter for a behavior-preserving move:

1. **The step can wait for the host.** An attack that would kill a working
   Mayor returns the redirect question before anything is written (Mayor
   r2995: the Storyteller chooses whether the Mayor or another player dies).
   The command path turns it into `requires-storyteller-choice`.
2. **The attacker's impairment belongs to the attack path.**
   `attackBlockReason` checks the attacker first, then the dead target, the
   Monk and the Soldier. The table asks the same function whether to prompt
   for a redirect, so a poisoned Imp that points at the Mayor asks for none.
3. **The attack has its own step record.** It is not the record of the shared
   `finishStep`: the outcome is the step result, the note is the victim or the
   reason nobody died, the log line is titled "Имп атакует" and marked
   `prevented` when nobody died, and the caller gets the outcome as `result`.
   The step does not list its target or the actor's impairment, and the log
   line carries no role or note key.
4. **Order is part of the record.** The death and the succession are written
   first, then the journaled redirect, the step time, the attack line, the
   conditional steps, the heir question and last the win check. The heir
   question must be on the step before the win check, because a pending heir
   blocks every win.

## The attack decision

```ts
| { readonly kind: "attack"; readonly playerId: string; readonly title: string }
```

The Imp's rule is one sentence: "choose a player: they die". Everything that
decides whether they die is a shared mechanic. The decision therefore names
the chosen player and nothing else about the attack. The engine takes the
attacker from the acting seat, the redirect from the host and the cause of
death from the attack path; a role that names any of them fails the type
check.

An `attack` intent inside `effects` was considered and not used:

- An attack can stop for the host. In a list of intents the engine would have
  to ask before it applies any of them, or an earlier intent would be written
  for a step that then waits. A decision has no earlier intent.
- The attack step has its own record. An `effects` decision also carries a
  note and a result, which the attack record would overwrite.
- One attack per step is what Trouble Brewing has. The Bad Moon Rising and
  Sects & Violets Demons do not use `resolveAttack`: the host records their
  deaths. ADR 0002 grows the union only with a migrated role.

ADR 0002 lists `effects`, `suppressed` and `no-effect` for a night step. Its
resolution order already has the attack as its own stage after the intent, so
the fourth decision names that stage; the ADR note for this slice records it.

## The Imp does not read `impaired`

The Poisoner, the Monk and the Butler return `suppressed` when they are drunk
or poisoned. The Imp returns the same `attack` in both cases, and the attack
path stops an impaired attacker (States r1039: a poisoned Demon cannot kill
anyone).

A second check in the module would be a second source for the same fact
(fact 2), and the `suppressed` path writes the shared failure note, while the
branch wrote the attack's own reason, "Демон отравлен или пьян: смерти нет.",
without a note key. Keeping one owner keeps the record.

## The coordinator outcome

`applyRoleAbility` returned nothing; the step then finished through
`finishStep`. It now returns what the caller still owes the step:

- `applied`: finish through the shared path, as before;
- `needs-redirect` with the options: nothing was written, return the question;
- `attack` with the outcome and the title: write the attack's own record.

`resolveAttack` itself is unchanged. It returns the redirect question before
it writes, and the `attack` branch of the coordinator applies nothing before
it calls the attack path, so the waiting step stays untouched by construction.

The host's answers arrive as one object, `{ chosenRoleId, redirectId }`. The
character answer was a positional argument; the redirect is the second answer
a step can carry. The role sees `chosenRoleId` as a fact and never sees the
redirect.

## The attack step finisher

The body of the branch after the redirect question moves into
`finishAttackStep` in `night.ts`, beside `finishStep`, line for line. Two
things change in it:

- the log title comes from the decision, so the engine holds no role title
  ("Имп атакует" is not the catalog name of the role, "Чёрт", so it cannot be
  derived);
- the journaled redirect names `step.actorId` instead of `actor.id`, which is
  the same seat.

The note key `note.impKilled` stays in the finisher. Its text is the generic
"Погиб: {name}." and the victim is known only after the redirect, so a role
cannot write it. The key is part of saved steps, so it is not renamed.

## Role

Imp (r3116), timing `other`, step `{ target: "one-any" }`:

- a choice returns `attack` on the chosen player with the title "Имп
  атакует", whoever is chosen: a dead player and the Imp's own seat are legal
  choices;
- the succession stays in the module's `death-trigger` capability, unchanged.

Target validation stays in the engine: exactly one target is the shared
`one-any` check that returns `error.39` before the resolver runs.

## Record quirks kept on purpose

These are bytes of saved games and replays. This change does not alter them,
and each would be its own reviewed change:

- the attack step keeps `targetIds` empty and sets no `impaired` flag; the
  outcome is in `result`;
- the reason nobody died is Russian text without a note key, and the attack
  line carries no role or note key, so the console shows them untranslated;
- a redirect answer sent with an attack that asked for none is still written
  to the secret journal;
- the command result reports no follow-up for a pending heir; the table reads
  the question from the step.

## Not in this change

- `death.ts` still names the role in the self-kill cause, in the succession
  fallback and in the heir path, and `becoming.ts` writes the new role. They
  are the shared succession, not a night step.
- `appendConditionalSteps` places the new Demon's wake after the Imp's step
  and still finds it by role.
- The table read model and the table screen still ask for the redirect and
  mark a dead target by role name (`src/application/read-models/table.ts`,
  `src/ui/screens/table/step-context.ts`).
- The information roles are later pull requests of the same slice.

## Compatibility and proof

No storage, command, journal, schema or pin changes.

1. Thirteen characterization tests were added to `engine.test.ts` and run on
   the untouched branch: the full step, death and log records and the draw
   order of a kill; the four reasons nobody dies; the redirect question that
   changes nothing; the journaled redirect; the host letting the Mayor die;
   the succession with one and with several Minions; the win check at the end
   of the step; preview, apply, replay and export on the command path; and
   the host choice on the command path.
2. The same tests pass unchanged after the move.
3. A seeded driver played 200 games per edition through `applyCommand` on
   main and on this change, hashing the full serialized state and every
   command result. All 600 digests are equal. The driver leans the Imp toward
   the Mayor, the Soldier, the Monk's choice, a dead player and its own seat,
   answers the redirect question, and sends stray redirect answers and
   registrations.

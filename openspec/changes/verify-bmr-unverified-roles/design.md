# Design

## Decision

Verify each listed Bad Moon Rising mechanic with one test built from the pinned
official text, then fix only the engine paths the tests expose. The Storyteller
still decides every choice the printed ability leaves open (which target, which
character, which player is regurgitated); the engine owns the deterministic
part.

- **Courtier.** The existing drunk effect already starts at the Courtier step
  and expires at the night three cycles later
  ([Courtier r2968](https://wiki.bloodontheclocktower.com/index.php?title=Courtier&oldid=2968)).
  The test locks the affected character, the three nights and days, the
  healthy fourth night, and the once-per-game step.
- **Innkeeper.** The step already stores `protected` effects that end at dawn
  and one `drunk` effect that ends at dusk. The test locks both targets and the
  chosen recipient ([Innkeeper r3160](https://wiki.bloodontheclocktower.com/index.php?title=Innkeeper&oldid=3160)).
- **Gambler.** A wrong guess killed the Gambler even when the ability was
  impaired. The step now checks `isImpaired` before the guess can kill, matching
  every other role branch ([Gambler r3073](https://wiki.bloodontheclocktower.com/index.php?title=Gambler&oldid=3073)).
- **Sailor.** The chosen recipient is stored as a `drunk` effect that expires at
  the next dusk, and the Sailor may choose themself
  ([Sailor r1768](https://wiki.bloodontheclocktower.com/index.php?title=Sailor&oldid=1768)).
- **Shabaloth.** Two kills and the optional regurgitation stay in the outcome
  controls; the engine stores the last targets and the outcome may resurrect
  only one of them. No step change was needed
  ([Shabaloth r1790](https://wiki.bloodontheclocktower.com/index.php?title=Shabaloth&oldid=1790)).
- **Godfather.** The first-night information already lists the living Outsiders
  from the real roles; the other-night step exists only after an Outsider died
  today and the outcome controls record the kill
  ([Godfather r2394](https://wiki.bloodontheclocktower.com/index.php?title=Godfather&oldid=2394)).
- **Moonchild.** Two defects: `completeStep` skipped every dead actor except the
  Ravenkeeper, so the next-night step could never be completed, and
  `makeBmrStep` dropped the stored public choice. The step now exempts the
  Moonchild, copies its target, reuses that record when no target is supplied,
  and rejects a different choice, deterministically killing a good target
  ([Moonchild r1783](https://wiki.bloodontheclocktower.com/index.php?title=Moonchild&oldid=1783)).
- **Professor.** `recordBmrOutcome` resurrected any `resurrectId`, bypassing the
  step's Townsfolk check. The outcome path now only repeats the step's chosen
  target after a completed, unimpaired step, so a standalone outcome and a
  second resurrection in the same use are rejected. The step itself and the
  outcome are gated on `!isImpaired`. The once-per-game flag already prevents a
  second step
  ([Professor r1775](https://wiki.bloodontheclocktower.com/index.php?title=Professor&oldid=1775)).
- **Fool.** `bmrCannotDie` already prevents the first death and spends the
  ability. The test locks a prevented ability death, a prevented first
  execution, the second death, and the Assassin bypass already covered by the
  existing test ([Fool r2636](https://wiki.bloodontheclocktower.com/index.php?title=Fool&oldid=2636)).

## Alternatives

- Rebuild each ability as a new helper: rejected. The existing `effects.ts`,
  `death.ts`, `night.ts` and `information.ts` helpers already implement the
  mechanics; verifying them needs tests and three small fixes, not a second
  code path.
- Let the Moonchild step be completed through a manual correction instead of a
  night step: rejected. The official ability resolves during the night and the
  step already carries the public choice.
- Resurrect any `resurrectId` for the Professor and trust the host: rejected.
  The matrix row claims the engine checks the team; the command path must not
  contradict the step.

## Compatibility

No schema or command change. `NightStep.targetIds` was already in the type; the
Moonchild step now populates it. A save created before this change still loads;
its Moonchild step, if any, gains the target only when the queue is rebuilt.

## Risk

- The Courtier's drunk effect stays active after the Courtier dies. That matches
  the stored effect lifetime already used by the engine and is asserted by the
  new test.
- The Gambler's impairment check reads the effect graph at the step time; a
  later poison does not revive the ability. That is the intended "abilities
  work when they are used" rule.

## Verification

- RED: the new Gambler, Moonchild and Professor assertions fail; the Shabaloth
  fixture also failed because its chosen target was a Sailor, not because of an
  engine rule, and the fixture was corrected.
- GREEN: all new tests pass and the full BMR suite stays green.
- `openspec validate --changes --strict`, `openspec validate --specs --strict`
  and `node scripts/openspec-check.mjs` pass.

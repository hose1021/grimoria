# Independent rule audit — 2026-11-16

Scope: the 72 supported Trouble Brewing, Bad Moon Rising and Sects & Violets
roles and the interactions the pinned text defines. This is a review artifact,
not a rules authority: `docs/rules-matrix.md` keeps the pin and status of every
row, and `docs/role-ownership.md` keeps the implementation owner.

## Method

- Sources: the fetched pinned snapshots in `docs/official/wiki/` (provenance
  verified by `node scripts/check-official.ts`), each role dossier in
  `src/core/roles/<role>/rule.md`, the matrix row, the cited test bodies and the
  implementation in `src/core/engine`.
- Independence: three read-only reviewers, one per edition, read the pinned text
  first and derived the expected behavior from it. A cited test was accepted only
  when its body asserts the claim; a test name or a green suite was not accepted
  as evidence.
- Verdicts: `matches` (pin, code and an asserting test agree), `gap` (code
  contradicts the pin or offers no legal control), `unverified` (implemented but
  no asserting test) and `host-choice` (the pin leaves the decision to the
  Storyteller and the engine exposes it).
- The author re-checked every reported gap against the pin and the code before
  acting. A reported gap that the reviewer missed is recorded as a false
  positive with the evidence that refutes it.

## Trouble Brewing (22 roles)

All 22 pinned role pages were read. The night order, the Baron setup shift, the
Mayor and Saint win thresholds, the Scarlet Woman succession and the Imp
self-kill succession match their pins. The core claim of every role has an
asserting test.

### Corrected audit finding

The reviewer reported that the Chef's per-player registration map can only
produce 0 or 2 on the pinned Recluse board. `information.ts` has
`chefRegistrationRange`, and the Chef step offers every count between the
unavoidable minimum and the possible maximum.
`src/core/engine/engine.test.ts` "the Chef offers the count for a Recluse
registered per pair (TB-CHEF-02)" asserts the pinned r2510 example, including
the accepted `1` and the rejected `3`. The `chefCount(map)` helper still takes
one value per player, but the information path that reaches the Storyteller does
not use that limitation as the legal range. **False positive.**

### Asserting tests added by this change

- `the Fortune Teller answers yes for a real Demon` — the Demon branch of the
  answer, not only the red herring and the negative cases.
- `a drunk or poisoned Soldier dies to the Demon` — protection depends on the
  Soldier's sobriety.
- `the Drunk has no ability at any phase` — the Drunk's permanent impairment.
- `the Monk cannot choose themself` — the `error.40` rejection at night two.
- `the Ravenkeeper reads the chosen player's character` — the learned value, not
  only the existence of the step.
- `the Saint's night death does not lose the game` — only an execution loses.

### Recorded limitations

- **Drunk or poisoned Librarian cannot answer "zero" at the night step.**
  `Librarian.r1721` defines "1 of 2 … (Or that zero are in play.)" and
  `Drunk.r3165` says the Storyteller "may give them false information instead";
  giving the true answer stays legal. When the setup recorded the zero answer and
  the actor is impaired, `information.ts` offers only Outsider roles, and the
  existing test asserts `zero === undefined`. Adding the zero answer changes the
  given shape and the UI, and the current choice is deliberate; it needs an owner
  decision before changing. The setup surface already records zero, so the gap
  is limited to the night-step answer.
- **Generic registration values.** `legalRegistrations` exposes only the values
  a query reads (`spy: good`, `recluse: evil, demon`). The pins allow the Spy to
  register as a Townsfolk or Outsider and the Recluse as a Minion, and the reads
  (`registersAsTownsfolk`, `registersAsMinion`) support them. The affected TB
  queries use dedicated controls (setup pair validation, the Slayer
  `recluseRegistersDemon` option, `characterChoices`), so no TB rule outcome is
  lost; the host cannot record the other values in the generic registration map.

### Remaining evidence gaps

Washerwoman pair validation error codes, the Undertaker's Spy/Recluse character
choice, the sober Spy triggering the Virgin, the sober Slayer hitting a
Recluse-registered Demon and the registration control's legal value set have no
asserting test. These are matrix evidence gaps, not reproduced rule defects.

## Bad Moon Rising (24 roles; Barber is Sects & Violets)

All pinned role pages were read. The Assassin, Courtier, Devil's Advocate,
Gambler, Goon, Lunatic, Mastermind, Minstrel, Pukka, Sailor, Zombuul, Fool,
Pacifist and Tea Lady core flows match their pins and have asserting tests.

### Fixed in this change

- **Godfather — a dead target is legal.** `Godfather.r2394` How to Run says "they
  point at any player", and the Tips example has the Godfather kill themself.
  `bmr.ts` listed `godfather` in `ALIVE_TARGET_ROLES`, and
  `bmr.test.ts` asserted the rejection. The live flow already accepted a dead
  target; the helper and its test now match the pin.
- **Professor — a living target is rejected before the ability is spent.**
  `Professor.r1775` says "choose a dead player". `completeBmrStep` set
  `used.professor` before checking the target. `completeStep` now rejects a
  living target with `error.professor-dead-only`, and the test asserts both the
  rejection and that the once-per-game is not spent.
- **Chambermaid — an Exorcist-blocked Demon is not a wake.**
  `Chambermaid.r2966` counts characters "who woke tonight due to their ability",
  and `Exorcist.r2973` says the chosen Demon "doesn't wake tonight". The count
  included a blocked step completed only for Shabaloth regurgitation; it now
  excludes `blocked` steps. New test:
  `a Demon blocked by the Exorcist is not counted as having woken`.
- **Gossip — the death is asserted.** The cited test asserted only the queued
  step. It now completes the step and records the death, so the pin's "a player
  dies" is proven.

### Corrected audit findings (false positives)

- **Moonchild alignment.** The resolution reads
  `actor.used.moonchildTargetEvil`, stored when the public choice was made. The
  `target.team` read in `bmr.ts` is only the legacy-save fallback. The pinned
  choice-time rule is implemented and the existing test covers the Goon.
- **Grandmother target and death.** `night.ts` rejects an evil or
  non-Townsfolk/Outsider grandchild with `error.grandchild`, and the existing
  test asserts `state.players["4"].alive === false` after the Demon kills the
  grandchild. Both reported gaps are already covered.
- **Barber died-then-Barber.** The S&V test
  "a player who died and then became the Barber enables no swap" already asserts
  the pinned prohibition.

### Recorded limitations

- **Sailor and Innkeeper drunk recipient.** The pins require one of the two
  chosen players to be drunk; `drunkId` is optional and is not validated against
  the two targets, so the host can leave both sober or name a third player. The
  existing test "the Sailor and Innkeeper use only the host's drunk choice"
  asserts the permissive behavior. Enforcing the mandatory choice needs a UI
  control and an owner decision, so it is recorded, not changed.
- **Courtier duplicate characters and Minstrel Travellers.** Both clauses are
  unreachable in the supported editions: the bag rejects duplicate roles and
  Travellers are outside the supported set.

### Remaining evidence gaps

Exorcist identity disclosure, Godfather impaired first-night information,
Minstrel duration, Pacifist execution bookkeeping, Tinker protection, Tea Lady
Assassin exception, Shabaloth already-dead target, Zombuul/Mastermind example and
the Pukka cross-role examples are implemented but not asserted. They stay listed
for the next slice.

## Sects & Violets (24 roles)

All pinned role pages were read. The Cerenovus, Evil Twin, Fang Gu, Flowergirl,
Juggler, Klutz, Mathematician, Mutant, No Dashii, Oracle, Pit-Hag, Savant,
Seamstress, Snake Charmer, Sweetheart, Vigormortis, Vortox, Witch and Barber
core flows match their pins and have asserting tests.

### Fixed in this change

- **Philosopher — a borrowed character is in play for the Pit-Hag.**
  `Philosopher.r2421` How to Run swaps the Philosopher token with the chosen
  character token, so the borrowed character exists in the game. The Pit-Hag's
  `roleInPlay` check now counts `used.philosopherAbility`, and a Pit-Hag choosing
  that character records `note.pithagInPlay` instead of creating a second
  holder. New test:
  `a Pit-Hag cannot create a character the Philosopher borrowed`.

### Recorded limitations

- **Artist under a Vortox.** `Vortox.r3017` requires false information whenever a
  Townsfolk ability prompts information. The Artist's question is free-form, so
  the engine cannot compute the true answer and cannot force a false one; it
  records the Storyteller's answer and the matrix marks the row `host-choice`.
  The hostile-information warning stays with the Storyteller.
- **Dreamer and Sage information content.** Both steps are host-adjudicated and
  the engine records a note rather than a validated pair; the Dreamer's
  "1 good and 1 evil character, 1 correct" pair and the Sage's "1 of 2 players,
  one the Demon" pair have no host control that stores the pair. The matrix marks
  them `host-choice`/evidence-gap; the Storyteller shows the pair at the table.

### Corrected audit findings

- **Dreamer self-target** is asserted (`error.40`); the missing part is the pair
  content, recorded above.
- **Clockmaker impairment.** The pin says nothing about impairment, so
  `SNV-CLOCKMAKER-02` is a host choice, not a verified rule; the dossier marks it
  `host-choice`. The dead-Minion count relies on Glossary r3168, which the
  matrix's source table pins separately.
- **Trigger-time impairment rows** (Fang Gu, Barber, Klutz, Sweetheart,
  Vigormortis) are asserted by tests; the governing pin is States r1039, which
  the matrix source table pins. The revision cell names the role page, not the
  States page.
- **Cerenovus test citation** said "next day only"; the test and the pin say
  "next day and night". The matrix citation is corrected.

### Remaining evidence gaps

The Town Crier's post-character-change answer, the Clockmaker impaired host
choice, and the Dreamer/Sage pair content have no asserting test. They stay
listed.

## Cross-role interactions re-checked

- Monk/Soldier/Mayor: protection, bypass and redirect precedence match the pins;
  the impaired Soldier now has a test.
- Fool/Sailor/Tea Lady/Innkeeper/Assassin: prevention, replacement and bypass
  order match the pins; the Assassin still kills through protection.
- Pukka/Exorcist/Innkeeper/Tea Lady: the poison, delayed death and blocked wake
  paths match the pins; the blocked wake is now excluded from the Chambermaid.
- Scarlet Woman/Imp: succession threshold and the day-time new Demon wake match.
- Mastermind/Zombuul: the Mastermind extension is tested; the Zombuul
  fake-execution branch is implemented by `execution.deathId` but not asserted.
- Evil Twin/Fang Gu/Pit-Hag/Vigormortis: the pair is player-id based, alignment
  is re-checked, a dead holder retains the ability through the Vigormortis, and
  a borrowed Philosopher character blocks a duplicate creation.
- Vortox/madness: the Vortox flips computed information and blocks a no-execution
  day; the Artist remains a host answer because the true answer is not
  computable.

## Acceptance impact

This audit closes the evidence gaps it could close with focused tests and fixes
the three BMR defects and one S&V interaction it reproduced. The remaining
limitations above are explicit, source-cited and not claimed as automated. The
rules matrix and the role dossiers record the same statuses.

# Tasks

## 1. Red tests

- [x] 1.1 Add replacement cases to `js/snv.test.mjs`: Pit-Hag change, duplicate
  rejection, Demon removal; Snake Charmer swap, non-Demon and dead targets, the
  permanent poison and the evil Snake Charmer; Barber swap, another-Demon
  rejection with a Demon self-swap, and the Evil Twin win following the
  good-aligned player rather than the character's new holder; the Philosopher
  borrowed ability, impaired and declined cases, self-choice, the drunk entering
  play later, a former Philosopher, a borrowed death-triggered ability and a
  fresh ability after regaining the character; export/import.
- [x] 1.2 Run them against the reviewed engine and record the failure.

## 2. Character changes

- [x] 2.1 Add `replaceCharacter`, `swapCharacters` and the queue recalculator to
  `src/core/engine/sv.ts`; pin the alignment through `realTeamOf`, swap
  alignments only for the Snake Charmer, and keep the Evil Twin pair by player.
- [x] 2.2 Apply the Pit-Hag, Snake Charmer, Barber and Philosopher abilities in
  `completeSvStep`, returning the rejection through `completeStep`.
- [x] 2.3 Require a living Snake Charmer target (a typed rejection for a dead
  one) and a source-independent poison effect marked `permanent`.
- [x] 2.4 Allow the choosing Demon to swap itself and reject another Demon.
- [x] 2.5 Spend the Philosopher ability only after a character is chosen, accept
  the Philosopher's own character, clear the marker on a former Philosopher and
  on regaining the character, and reconcile the drunk after every replacement.
- [x] 2.6 Mark the Philosopher drunk in `src/core/model/effect-graph.ts` so it
  ends when the source dies; keep a borrowed death-triggered ability working.
- [x] 2.7 Let the death-triggered roles complete their own step in
  `completeStep`, drive `pruneDeadSteps` from the same map and add
  `moonchild`.
- [x] 2.8 Track the Evil Twin pair by player id in `setup.ts`, `state.ts` and
  `types.ts`, and resolve the win from `realTeamOf` in `death.ts`.
- [x] 2.9 Move `insertStepInto` to `context.ts` to remove the `sv.ts`/`night.ts`
  import cycle.
- [ ] 2.10 Disable dead seats for the Snake Charmer in
  `src/ui/screens/table/cards.tsx`. Deferred to PR #99, which owns that file;
  the engine rejects a dead target instead.
- [x] 2.11 Require the current `eviltwin` holder to be alive and unimpaired in
  `evilTwinPair`; a dead Evil Twin or one whose character left play stops both
  the execution win and the "good cannot win" block.
- [x] 2.12 Skip `permanent` poisons in `reconcileNoDashiiPoison`, so a Snake
  Charmer who swapped with the No Dashii keeps the poison.
- [x] 2.13 Backfill `setup.evilTwinGoodPlayerId`/`setup.evilTwinPlayerId` once in
  `importGame` for saves written before the player ids existed.
- [x] 2.14 Update the `swapCharacters` comment to the player-tracked pair.
- [x] 2.15 Keep the pair as the two stored players, so a Barber swap of the two
  twins keeps the win and the both-live block; the ability holder is the current
  `eviltwin` holder and the execution resolves before its death.

## 3. Verification

- [x] 3.1 Run `npm test` and record the count.
- [x] 3.2 Run `npm run verify`, `node scripts/openspec-check.mjs`,
  `openspec validate --changes --strict`, `openspec validate --specs --strict`
  and `git diff --check`.
- [x] 3.3 Move the four role rows in `docs/rules-matrix.md` to `verified`.
- [x] 3.4 Commit, report and stop; the owner merges.

## Evidence

- RED: `git stash push -- src/ && node --test
  --test-name-pattern="Pit-Hag|Snake Charmer|Barber|Philosopher|replacement|Evil Twin win|inheriting"
  js/snv.test.mjs` against the reviewed engine produced `tests 22`, `pass 17`,
  `fail 5`, including:
  `✖ the Snake Charmer cannot choose a dead player` — `"status":"allowed"`;
  `✖ the Snake Charmer's poison outlives the new Demon` —
  `AssertionError [ERR_ASSERTION]: the poison does not end when the Demon dies`;
  `✖ the Evil Twin win follows the good twin after a character swap` —
  `AssertionError [ERR_ASSERTION]: the deal resolves the pair by player`;
  `✖ inheriting the good twin's character does not move the Evil Twin win` —
  `reason: "Цель не найдена."`;
  `✖ a player who regains the Philosopher has a fresh once-per-game ability` —
  `AssertionError [ERR_ASSERTION]: a fresh once-per-game ability`.
- GREEN: the same `node --test` command on the fixed engine produced `tests 22`,
  `pass 22`, `fail 0`.
- GREEN: `npm test` -> 328 tests, 328 pass, 0 fail after rebasing onto
  `origin/main` (`d1603d1`).
- GREEN: `npm run verify` passes (typecheck, oxlint, oxfmt, 328 tests, build,
  fallback, offline, policy).

## Third-review evidence

- RED: `git stash push -- src/ && node --test
  --test-name-pattern="Pit-Hag|Snake Charmer|Barber|Philosopher|replacement|Evil Twin|inheriting|No Dashii reconcile|imported save"
  js/snv.test.mjs` against the reviewed engine produced `tests 27`, `pass 23`,
  `fail 4`:
  `✖ a No Dashii reconcile keeps the Snake Charmer's permanent poison` —
  `AssertionError [ERR_ASSERTION]: the No Dashii reconcile leaves it active`;
  `✖ a dead Evil Twin cannot win on the good twin's execution` —
  `AssertionError [ERR_ASSERTION]: a dead Evil Twin has no ability`;
  `✖ an Evil Twin that leaves play stops the twin win and the block` —
  `AssertionError [ERR_ASSERTION]: no Evil Twin ability is in play`;
  `✖ an imported save resolves the twin pair before a swap` —
  `AssertionError [ERR_ASSERTION]: backfilled from the roles`.
- GREEN: the same `node --test` command on the fixed engine produced `tests 27`,
  `pass 27`, `fail 0`; `npm test` -> 328 tests, 328 pass, 0 fail.

## Fifth-review evidence

- RED: `git stash push -- src/ && node --test --test-name-pattern="twins"
  js/snv.test.mjs` against `16f57ad` produced `tests 2`, `pass 0`, `fail 2`:
  `✖ the two twins may swap characters and keep the pair` —
  `AssertionError [ERR_ASSERTION]: the good-aligned twin still wins for evil`;
  `✖ both twins alive still block a good win after they swap` —
  `AssertionError [ERR_ASSERTION]: good cannot win while both twins live`.
- GREEN: the same command on the fixed engine produced `tests 2`, `pass 2`,
  `fail 0`; `npm test` -> 339 tests, 339 pass, 0 fail after rebasing onto
  `origin/main` (`e80c961`).

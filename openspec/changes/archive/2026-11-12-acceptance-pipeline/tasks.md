# Tasks

## 1. RED: a setup-only game cannot reach a finale

- [x] 1.1 Add `js/acceptance.test.mjs`: a fixed five-player Trouble Brewing game that starts through `startGame` and is driven to a finale by validated commands only, and a seeded sample of 33 preset games (counts 5-15, three seeds each) with the same path and a determinism replay.
- [x] 1.2 Assert the acceptance contract: every command validates as allowed first, targets and false information come from the engine's options, redirects and Demon heirs come from the story-teller-choice options, the journal explains every phase/night/day/finale step, and the fixed path exercises `startGame`, `completeNightStep`, `endNight`, `openNominations`, `nominate`, `recordVotes` and `execute`.
- [x] 1.3 Run the new suite against the pre-change engine and record the failure.
- RED: `node --test js/acceptance.test.mjs` -> 2 tests, 0 pass, 2 fail: "startGame must be a legal option: command-unknown". A game that only ran setup had no command that takes it into the first night.

## 2. GREEN: the missing start action

- [x] 2.1 Add `startGame` to `src/core/engine/commands.ts`: deal the prepared bag (with an optional assignment), seal the seat order, fill only derived setup secrets (`autoSecrets({ onlyMissing: true })`) and start night 1; a missing host-only false-information pair still blocks the start.
- [x] 2.2 Register the command in `src/core/commands/contracts.ts` and `src/core/model/types.ts` and export it from `src/core/engine/index.ts`.
- [x] 2.3 Re-run the new suite and the command tests.
- GREEN: `node --test js/acceptance.test.mjs` -> 2 tests, 2 pass, 0 fail.
- GREEN: `npm test` -> 396 tests, 396 pass, 0 fail.

## 3. Verification

- [x] 3.1 Run `npm run format`.
- [x] 3.2 Run `npm test` and `npm run verify`.
- [x] 3.3 Run `node scripts/openspec-check.mjs`, `openspec validate --changes --strict` and `openspec validate --specs --strict`.
- [x] 3.4 Run `git diff --check` and confirm a clean worktree after the commit.
- [x] 3.5 Open the pull request, report the RED/GREEN evidence and stop; no merge.

## Evidence

- RED: `node --test js/acceptance.test.mjs` -> 2 tests, 0 pass, 2 fail. Both failed at the first start with `startGame must be a legal option: command-unknown`.
- GREEN: `node --test js/acceptance.test.mjs` -> 2 tests, 2 pass, 0 fail; the fixed game and all 33 sampled games reached a finale, and the sampled replay reproduced the same summary.
- Sampled interval: Trouble Brewing presets for player counts 5-15 inclusive, seeds 1, 2, 3 per count (preset variant `seed % 3`), 33 games. The assignment and host choices use a seeded `mulberry32`; one seed is replayed for determinism. Not exhaustive over all legal bags, seat assignments or target choices.

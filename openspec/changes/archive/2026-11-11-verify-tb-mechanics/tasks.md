# Tasks

## 1. RED: failing regressions

- [x] 1.1 Add engine tests for the Librarian pair and zero result, the
      Investigator pair, the Librarian zero impairment, the Recluse/Spy dead
      registration, the poisoned Saint, the Spy grimoire, the official night
      order, every information role's impairment override, the Undertaker and
      Ravenkeeper impairment, the nomination limits and the 5–15 end-to-end
      game.
- [x] 1.2 Run `node --test --test-name-pattern="Librarian impaired|Recluse registers" js/engine.test.mjs`
      and record the two intended failures.
- [x] 1.3 Record the RED command and failing assertions in the Evidence
      section.

## 2. GREEN: minimum fixes

- [x] 2.1 Narrow `registersAsDemon` in `src/core/engine/information.ts` to the
      explicit `demon` registration.
- [x] 2.2 Return an impaired false-information choice for a Librarian whose
      setup result is zero, with a default pair and no `zero` flag.
- [x] 2.3 Run the targeted tests and confirm they pass.
- [x] 2.4 Run `npm test` and record the pass count.

## 3. Verification and documentation

- [x] 3.1 Update the `## Trouble Brewing` and `## Cross-cutting rules` rows in
      `docs/rules-matrix.md` to `verified` with the new test references.
- [x] 3.2 Run `npm run format`, `npm run verify`, `node scripts/openspec-check.mjs`,
      `openspec validate --changes --strict`, `openspec validate --specs --strict`
      and `git diff --check`.
- [x] 3.3 Report the RED and GREEN evidence on the pull request; do not merge.

## Evidence

- RED: `node --test --test-name-pattern="Librarian impaired|Recluse registers" js/engine.test.mjs` -> 2 tests, 2 fail. The Librarian zero step returned `needsChoice: undefined`; `registersAsDemon` returned `true` for a Recluse registered only as `evil`.
- GREEN: the same command -> 2 tests, 2 pass.
- Targeted: `node --test --test-name-pattern="Librarian|Investigator|Recluse registers|poisoned Saint|Spy sees|official first-night|false information while impaired|impaired Undertaker|impaired Ravenkeeper|nominate only once|runs from deal" js/engine.test.mjs` -> 12 tests, 12 pass.
- Full suite: `npm test` -> 279 tests, 279 pass, 0 fail (after rebasing onto the writer-lock removal).

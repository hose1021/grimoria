# Tasks

- [x] Bind a private handoff to its original game, deal, player and shown assignment. Revalidate on render and claim.
- [x] Revalidate the mutable offline resources at install and replace the unsupported startup API.
- [x] Preserve library, seating and notes edits across windows. Recover a pristine window that loses the first save.
- [x] Restore custom scripts by content, make the library importer keyboard-accessible and preserve release fragments.
- [x] Reduce full-game serializations and offline artwork. Verify the patch with the production build.

## Regression evidence

- RED: Before the handoff fix, reordering two seats during an open card revealed the other player's role. The seat editor also kept its original order after a concurrent change. The player and seat projection regressions exercise both cases.
- RED: `node --test src/infrastructure/offline/offline-worker.test.ts src/entry/offline.test.ts` failed three assertions against the original worker and startup code. Catalog and router regressions also failed on the previous implementation for unsupported promises, out-of-order loads and fragment navigation.
- RED: A failed note save exported the previous text. Two stale library views lost an independent entry. Reimporting the same script left the edited pool in place. On empty storage two bag views could leave one unable to make its first save.
- RED: `node --test --test-name-pattern='unflushed notes editor|pristine window losing' src/entry/store.test.ts src/application/store/create-game-store.test.ts` failed both cases before the store began checking pending editor text and adopting the winning first save.
- GREEN: The offline and startup regression suites passed all 12 tests. The four focused store, storage and offline suites passed all 92 tests, including export and replay, concurrent first saves and compatible and conflicting updates during editing.
- GREEN: `npm run verify` passed with 1,639 application tests, 24 additional tooling tests, all production builds and the repository policy checks. The full script test run passed 141 tests. `npm run verification:all` passed, and strict OpenSpec validation accepted 38 changes and 27 baseline specs.
- GREEN: In the production browser preview, reordering covered a private card, the new offline shell referenced a bundle in the new cache, and boot succeeded with `Promise.withResolvers` unavailable. The last selected locale won when downloads arrived out of order. The release link and direct fragment URL reached the article at a 390 px viewport.
- GREEN: With two setup windows on a fresh origin, both displayed a legal saved bag. Two library additions survived reopening, keyboard navigation reached Import, reimport restored the missing role, a blocked storage getter left the reference route usable, and the recovery backup contained the text from a failed note save.
- GREEN: On the same production inputs, offline artwork shrank from 181 to 87 files. A successful note command executed once, with three full-game serializations instead of five.

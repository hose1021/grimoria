# Tasks

- [x] Preserve live sessions, adopt valid external repairs and retain distinct damaged originals.
- [x] Isolate installation caches, fall back to the network after cache errors and respect Later.
- [x] Validate downloaded language catalogs, offer a retry and translate seat labels and live announcements.

## Regression evidence

- RED: On 0.12.5, repeated loads backed up the same damaged bytes multiple times. Equal timestamps could overwrite a different original. A truncated external write replaced a seven-seat game with a fresh eight-seat game. Clean windows with a normalized legacy or damaged save missed a subsequent repair. A migration could overwrite an empty primary before it was backed up.
- GREEN: `node --test src/application/store/create-game-store.test.ts src/infrastructure/adapters.test.ts src/entry/store.test.ts` passed all 101 tests, including recovery under quota pressure and overlapping writers.
- RED: In the generated worker, two scopes sharing a legacy cache lost the sibling shell on update. A failed cache read blocked working network requests. A duplicate update notification reopened the prompt after Later.
- GREEN: `node --test src/entry/offline.test.ts src/infrastructure/offline/offline-worker.test.ts` passed all 16 tests, including migration from a shared cache.
- RED: A missing catalog publication committed the previous language as the new selection. A malformed role entry left the language request pending. JavaScript replacement sequences in player names changed the rendered text. On the released Russian seat editor, selecting seat 2 announced “Seat 2 picked. Activate another seat to swap.”
- GREEN: `node --test src/infrastructure/catalog/load-locale.test.ts src/ui/i18n/strings.test.ts` passed all 14 tests. In the built app, a failed switch kept the English Chef page and Retry opened Повар. The Russian and Azerbaijani seat controls announced the same unfinished swap in the selected language and displayed the literal player name `Ada $&`.
- Two browser tabs on an isolated origin confirmed a damaged write kept the seven-seat session, retained the exact original bytes once, and accepted a later repair. The seat editor fit a 390-pixel viewport with a clean console.
- `npm run verify` passed with 1,667 application tests. All 141 tooling tests passed. Strict OpenSpec validation passed for 41 changes and 27 specs. `VERIFICATION_BASE_REF=origin/main npm run verification:all` passed. The full automated browser and game-scenario suites were not run locally.

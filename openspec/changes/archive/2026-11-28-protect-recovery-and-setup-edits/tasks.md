# Tasks

- [x] Protect the only copy of a damaged primary save and publish the final history state.
- [x] Invalidate obsolete bag Undo, retain failed Undo for retry and preserve multiple applicable edits.
- [x] Apply a confirmed change to a dealt bag in a single persisted command and discard obsolete script reads.
- [x] Flush pending notes on page suspension and select the full backup when clipboard access fails.
- [x] Restore direct Pages routes with storage blocked and surface an installed worker while checking for updates.

## Evidence

- RED: `node --test --test-name-pattern='subscribers see the committed|a damaged' src/application/store/create-game-store.test.ts` failed two cases on the old store. Replacing a smaller primary destroyed the last damaged bytes when the backup write failed. Subscribers saw the previous redo availability during notification.
- GREEN: All three focused cases passed. The application and entry-store suites passed 116 tests. The production preview retained the original primary while the backup was blocked and recovered it under the backup key once writes were enabled.
- RED: On 0.12.3, invoking a stale setup Undo after a seven-seat deal returned the game to setup with zero assignments. A rejected Undo consumed its history entry. Removing Chef from an eight-player dealt bag left only Chef, and failing the edit's second write erased the deal. A late URL import replaced a newer official script selection.
- GREEN: Seven focused probes ran the actual bag screen handlers against the real store. The browser suite includes the `bag-edit-races` case. In two production views Undo became disabled after the sibling dealt. Removing one role from a five-player synthetic game retained the other four in one revision. The script picker kept Bad Moon Rising after an older download.
- RED: On the previous production build the host typed “Draft” and the saved notes were still empty on an immediate pagehide. Pressing Copy with clipboard access unavailable raised an exception. The new lifecycle and clipboard unit tests also failed before wiring the fixes.
- GREEN: `node --test src/entry/notes-lifecycle.test.ts src/ui/screens/table/copy-backup.test.ts` passed both cases. The production field saved “Draft” on pagehide, and the export dialog selected all 16,390 characters of the backup when Copy was unavailable.
- RED: `node --test src/entry/offline.test.ts src/infrastructure/routing/history-router.test.ts` passed two of four tests before the fixes. A Pages fallback lost the requested destination when storage was denied, and a pending network check hid an already downloaded update.
- GREEN: All four tests passed, including idle and active update behavior. The generated Pages build restored the complete subpath, query and release fragment with session storage denied. The target release heading appeared 104 px from the top.
- GREEN: `npm run verify` passed 1,645 application tests, 24 tooling tests, the production build and its policy checks. `node --test 'scripts/*.test.ts'` passed 141 tests. `npm run verification:all` and strict OpenSpec validation passed for 39 changes and 27 baseline specs. The bag route fit a 390 px viewport.

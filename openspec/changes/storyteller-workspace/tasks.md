## Delivery

- [x] Test translated lookup and the first action on return.
- [x] Redesign the session entry, host preparation, night progress and reference discovery.
- [x] Verify the build, specifications and desktop/mobile flows.

- RED: `node --test src/ui/screens/reference/filter.test.ts` failed because the matching function was missing.
- GREEN: The same command passes with edition, local-name and spaced-ID matching.

- The production build, 1,668 application tests and strict OpenSpec passed locally. The initial PR build passed the complete Chromium suite and all ten full-game scenarios. The browser suite covers responsive layouts, session privacy, translations and offline reload.

# Tasks

## 1. Mobile order

- [x] 1.1 Split the bag header from the picker body and make the left column
      `display: contents` below 900 CSS pixels; order the header, the scenario
      and composition rail, then the picker body. Verify: the focused browser
      check at 390 px and a 1280 px screenshot.
- [x] 1.2 Add the focused `mobile-bag-order` case to `scripts/browser-check.ts`:
      at 390 px the count header, the scenario card, the composition card and the
      picker tabs appear in that order; the document does not overflow.
- [x] 1.3 Add the `CHANGELOG.md` entry under `Unreleased`.

## 2. Verification

- [x] 2.1 `npm run typecheck`, `npx oxlint src scripts vite.config.ts`,
      `npm run format:check` and `npm test` pass.
- [x] 2.2 `node scripts/openspec-check.ts` and
      `openspec validate --changes --strict` pass.

## 3. Evidence

- RED: with the original `bag.tsx`, `PG_BROWSER_CHECK=mobile-bag-order node
  scripts/browser-check.ts` fails: `the pickers follow the composition:
  {"count":76,"script":2630,"composition":2942,"tabs":202}`.
- GREEN: with the change, the same command passes and the capture at 390 px
  shows the scenario and composition directly under the player count.

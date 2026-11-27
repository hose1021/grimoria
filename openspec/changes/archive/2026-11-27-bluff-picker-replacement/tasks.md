# Tasks

## 1. Capped bluff selection

- [x] 1.1 Add `src/ui/screens/bluff-selection.ts` with `chooseBluff`: append
      below the required count, replace the oldest entry at the count, ignore a
      repeated pick.
- [x] 1.2 Add `src/ui/screens/bluff-selection.test.ts` covering the full list,
      the partial list and the repeated pick.
- [x] 1.3 Use `chooseBluff` in both bluff pickers and remove the full-list
      `disabled` guard in `src/ui/screens/bag.tsx`.
- [x] 1.4 Extend the `lunatic-setup` browser check: with a full Demon list and
      the picker open, a click on an offered character changes the list and
      keeps three entries.
- [x] 1.5 Add the `CHANGELOG.md` entry under `Unreleased`.

## 2. Verification

- [x] 2.1 `npm run typecheck`, `npm run format:check`, `npm test` and
      `npx oxlint src scripts vite.config.ts` pass. `npm run lint` fails in this
      harness before oxlint starts (`ESLint output (JSON parse failed: EOF ...)`),
      so the direct oxlint run is the recorded result.
- [x] 2.2 `PG_BROWSER_CHECK=lunatic-setup node scripts/browser-check.ts` passes.
- [x] 2.3 `node scripts/openspec-check.ts`, `openspec validate --changes --strict`
      and `openspec validate --specs --strict` pass.
- [x] 2.4 `npm run build`, `npm run fallback`, `npm run offline`,
      `node scripts/check-types-policy.ts`, `node scripts/check-official.ts`,
      `node scripts/check-acceptance.ts`, `node scripts/check-version.ts`,
      `node scripts/role-ownership.ts --check` and
      `node --test scripts/role-ownership.test.ts scripts/serve-dist.test.ts`
      pass.
- [x] 2.5 `node scripts/verification/test-index.ts` refreshed the test
      manifest; `node scripts/verification/gates.ts --scope=verified` and
      `VERIFICATION_BASE_REF=origin/dev node scripts/verification/gates.ts
      --scope=findings` pass.

## 3. Evidence

- RED: `node --test src/ui/screens/bluff-selection.test.ts` failed the full-list
  case: `actual [ 'a', 'b', 'c' ]`, `expected [ 'b', 'c', 'd' ]`.
- GREEN: the same command passes 3 tests, 0 failures.
- Browser: `PASS lunatic-setup (2853 ms)`.

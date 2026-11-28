# Tasks

## 1. Projection

- [x] 1.1 Add `shownAlignment: "good" | "evil" | null` to the seat projection,
      populated only for the Goon from the stored team.
      Verify: `node --test src/ui/screens/player-projection.test.ts`.
- [x] 1.2 Render the shown alignment as the role card's team label, falling back
      to the shown role's printed team. Verify: the browser check `goon-alignment`.

## 2. Labels

- [x] 2.1 Add `good` and `evil` to the ru, en and az catalogs and the team-key
      map. Verify: `node --test --test-name-pattern="Interface string parity|translation" src/ui/i18n/strings.test.ts`
      or `npm run typecheck` plus `npm test`.

## 3. Proof

- [x] 3.1 Unit-test Goon good/evil, the Lunatic mask and a non-Goon; keep the
      projection privacy assertions. Verify: `node --test src/ui/screens/player-projection.test.ts`.
- [x] 3.2 Add the production browser check `goon-alignment`: legal BMR seed,
      Pukka turns the Goon evil, `/table` journal line visible, `/player` shows
      the evil alignment. Verify: `PG_BROWSER_CHECK=goon-alignment node scripts/browser-check.ts`.

## 4. Records

- [x] 4.1 Register STATUS-011 as covered-but-unmapped and add the shared
      missing-test and re-pin updates. Verify:
      `node scripts/check-rule-exceptions.ts`.
- [x] 4.2 Regenerate the trace and readiness matrix. Verify:
      `node scripts/verification/build-trace.ts && node scripts/build-readiness-matrix.ts`.
- [x] 4.3 Add the `CHANGELOG.md` entry under Unreleased.

## Evidence

- RED: a focused check against `HEAD:src/ui/screens/player-projection.ts` (`node --test /tmp/red-projection-check.ts`) -> 1 test, 0 pass, 1 fail: `actual: undefined, expected: 'evil'` for the Goon's `shownAlignment`.
- GREEN: `node --test src/ui/screens/player-projection.test.ts` -> 3 tests, 3 pass, 0 fail; `npm test` -> 1470 tests, 1470 pass, 0 fail; `npm run typecheck` -> 0 diagnostics; `npm run format:check` -> all matched files formatted.
- GREEN: `PG_BROWSER_CHECK=goon-alignment node scripts/browser-check.ts` -> browser check passed; the `/player` card shows the evil alignment and the `/table` journal keeps the consequence.
- GREEN: `node scripts/check-rule-exceptions.ts` -> rule-exception check passed; `node scripts/build-readiness-matrix.ts` -> shared rules have no mechanical gaps.

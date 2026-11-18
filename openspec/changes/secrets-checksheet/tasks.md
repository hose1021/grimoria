# Tasks

## 1. Screen

- [x] Re-compose `src/ui/screens/secrets.tsx` as an index, one open obligation
      and a pinned footer. Evidence: `npm run typecheck`.
- [x] Render each pair as the one-of-two sentence with inline selects, keeping
      `data-info-role`, `data-player`, `data-info-zero`, `data-herring`,
      `data-reminders`, `.secrets-info`, `.secrets-status` and the start hooks.
- [x] Move the red herring, the reminders and the roster into obligation panes.
- [x] Keep the Drunk false-pair editor and the Librarian zero through
      `zeroShown` and `librarianZeroLegal`.
- [x] Put the BMR and S&V briefings on the same page head, error band and
      footer without an index.
- [x] Keep the start gate: names, seats, first night; disabled while
      `secretsErrors` reports a problem.
- [x] Replace the hardcoded Russian copy with keys in `ru`, `en` and `az`.

## 2. Regression harness

- [x] `scripts/browser-check.ts`: `fillPhoneSecrets` opens each obligation
      through `[data-obligation]`, reads the open pane's `h2`, fills the pair,
      then opens the herring pane. Existing assertions stay.

## 3. Verification

- RED: before the change, searching the route for hardcoded copy
  (`grep -n "Пары\|Готовность\|Сбор" src/ui/screens/secrets.tsx`) matched the
  headings, the readiness words and the step chips, so `en` and `az` could not
  translate them; the three `.secrets-info` editors rendered at one equal
  weight.
- GREEN: the same search over the rewritten screen matches nothing; the new keys
  pass `src/ui/i18n/strings.test.ts`, and a seeded browser run shows the index,
  the sentence editor and the checks at 1440×900 and 390×844.
- [x] `npm run typecheck` — pass.
- [x] `npm test` — 1183 tests pass.
- [x] `PLAYWRIGHT_MODULE=… node scripts/browser-check.ts` — pass: phone/tablet,
      night/day, Virgin, route cleanup, privacy, reload, cross-tab, languages,
      role sheet, dialog contract, offline reload, PWA update.
- [x] `npm run verify` — typecheck, lint, format check, tests, build, fallback,
      offline cache, source policy, official provenance, acceptance, version and
      role ownership all pass.
- [x] Real browser, seeded 9-player Trouble Brewing game at 1440×900 and
      390×844: index states, sentence editor, red herring pane, reminders,
      roster, error band, footer, enabled start after all answers, Russian and
      English copy, console clean.
- [x] Real browser, seeded 12-player game with the Drunk shown the Washerwoman:
      «Пьяница: Прачка» item, Drunk tag and hint.
- [x] Real browser, seeded BMR game: briefing without an index, support and
      reminders, footer readiness.
- [x] `impeccable detect --json --changed` — no findings.

## 4. Finish review

- [x] Adversarial review: first disposition `fix` with six findings (accent on
      the missing slot, phone dock overlap, stretched pane, footer reason, index
      state column and labels, BMR/S&V bag link). All six fixed.
- [x] Second review: `pass`, no open fix. Three follow-up polish items applied:
      a 2 px brass inset rule on the open row, `sr-only` state words on phones,
      and `role="status"` on the dock summary.
- [x] BMR briefing captured after the last edit: the dock holds the quiet
      «Настройка» link beside the start action.

## 5. Before the PR

- [x] Tracking issue opened: #284.
- [x] `openspec validate --changes --strict`.
- [x] `node scripts/openspec-check.ts`.
- [x] Open the PR against dev: #285.
- [ ] Record the CI result and stop.

# Tasks

Implementation starts only after the owner accepts this proposal. Each stage is
a separate commit on the same branch and can be reverted alone. The gate after
every stage: `npm run typecheck`, `npm test`,
`node scripts/check-types-policy.mjs`.

## 1. Failing check

- [x] 1.1 Add the seat publish assertion to `scripts/browser-check.mjs`: a
  renamed player must reach the ring, and a reversed published order must not
  replace the draft.
- [x] 1.2 Run the check on the parent commit and record the timeout: the legacy
  seat screen renders once and never reads the store.

## 2. Ports

- [x] 2.1 Add `commands.setOrder` and route `/seat`.
- [x] 2.2 Add `commands.startNight`, `setHerring`, `setSetupInfo` and
  `normalizeSecrets`, and route `/secrets`.
- [x] 2.3 Add `commands.bagUpdate` and `dealGame`, the `presets` port and the
  `library` port, and route `/bag`.

## 3. Screens

- [x] 3.1 `src/ui/screens/seat.tsx`: the ring, select/swap, pointer drag,
  shuffle, undo, commit and the empty state; delete `js/seat.js`.
- [x] 3.2 `src/ui/screens/secrets.tsx`: pairs, Drunk mask, herring, reminders,
  roster, BMR/S&V summaries and the start gate; delete `js/secrets.js`.
- [x] 3.3 `src/ui/screens/bag.tsx`: the four sections and every event path;
  delete `js/bag.js`.

## 4. Documents and gate

- [x] 4.1 Update `AGENTS.md`, `SPEC.md` and `docs/architecture.md`.
- [x] 4.2 Run `npm run verify`, `node scripts/browser-check.mjs`,
  `node scripts/openspec-check.mjs` and `openspec validate --changes --strict`.
- [ ] 4.3 Open the pull request, report the checks and wait for the owner.

## Evidence

- RED: `node scripts/browser-check.mjs` failed with
  `page.waitForFunction: Timeout 3000ms exceeded` on the seat publish assertion
  while `js/seat.js` owned the ring.
- GREEN: `node scripts/browser-check.mjs` passes with the native setup screens
  (phone/tablet, night/day, Virgin, route cleanup, privacy, reload, cross-tab,
  languages, role sheet, dialog contract, offline reload, update);
  `npm run verify` passes.
- Parity: a computed-style comparison of every element under `#screen` for
  `seat-7`, `seat-12`, `secrets-standard`, `secrets-bmr`, `secrets-snv` and
  `bag-standard` at 390 px and 1440 px matches the parent commit. The only bag
  differences are the card headers, because the legacy bridge injected a
  language select into every `<header>` — including the three preset cards —
  and the native screen has one switch in the page header.

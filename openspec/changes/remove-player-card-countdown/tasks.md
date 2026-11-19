# Tasks

## 1. Worktree and RED evidence

- [x] 1.1 Create the worktree from `origin/dev`:
      `git worktree add ../grimoria-player-card -b fix/remove-player-card-countdown origin/dev`.
- [x] 1.2 Add the focused `player-card` check to `scripts/browser-check.ts` and
      run it against the unchanged screen:
      `PG_BROWSER_CHECK=player-card node scripts/browser-check.ts` — failed with
      `the revealed card stays open without a countdown`, `0 !== 1`, because the
      45-second deadline still hides the card.

## 2. Remove the deadline and the cancel control

- [x] 2.1 Delete `HIDE_SECONDS`, `TICK_MS`, the `remaining` state, the
      `deadline` ref, the interval effect and the clock block from
      `src/ui/screens/player.tsx`.
- [x] 2.2 Delete the Cancel button and the unused `QUIET` style.
- [x] 2.3 Remove `autoHide` and `abandonedClaim` from the three locale files.
- [x] 2.4 GREEN: `PG_BROWSER_CHECK=player-card node scripts/browser-check.ts` —
      passed; the card stays open after 120 s of virtual time and Escape closes
      it.

## 3. Specifications and verification

- [x] 3.1 Replace the `Role card deadline` requirement in
      `openspec/specs/app/ui-shell/spec.md` and update `SPEC.md`.
- [x] 3.2 `npm run typecheck` — passed.
- [x] 3.3 `npm test` — 1273 passed.
- [x] 3.4 `npx oxlint src scripts vite.config.ts` and `npm run format:check` —
      passed.
- [x] 3.5 `node scripts/openspec-check.ts` — passed, 25 specs.
- [x] 3.6 `openspec validate --specs --strict` and
      `openspec validate --changes --strict` — passed.
- [x] 3.7 `npm run build` — built.
- [ ] 3.8 Push the branch, open the PR against `dev`, and report CI.

## Evidence

- RED: `PG_BROWSER_CHECK=player-card` failed before the screen change with
  `the revealed card stays open without a countdown`, `0 !== 1`.
- GREEN: `PG_BROWSER_CHECK=player-card` passes after the change, the unit suite
  reports 1273 passing tests, and typecheck, lint, format and the OpenSpec
  checks pass.

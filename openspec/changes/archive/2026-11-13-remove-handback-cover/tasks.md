# Tasks

## 1. Regression proof

- [x] 1.1 Rewrite the private-route step in `scripts/browser-check.mjs`: after
  `/player` open `/bag` and assert `.setup` renders without a click while
  `#return-host` does not exist; in the phone walkthrough drop the conditional
  `#return-host` activation before `.seat-ring`. Verify the updated step fails
  on the current source with `node scripts/browser-check.mjs` (RED).

## 2. Remove the gate

- [x] 2.1 Delete `src/ui/components/handback-cover.tsx` and remove its import,
  the `handback` branch and the `acknowledged` state and effect from
  `src/ui/shell.tsx`; verify `npm run typecheck` and `npm run lint` pass and
  `grep -r "HandbackCover" src` returns nothing.
- [x] 2.2 Remove the `playerCover` entry from `src/ui/i18n/locales/ru.ts`,
  `en.ts` and `az.ts`; verify `npm run typecheck` passes and `/player` renders
  no literal `playerCover` key.

## 3. Documentation

- [x] 3.1 Update `docs/architecture.md` "UI shell" and the `src/ui/shell.tsx`
  row of `AGENTS.md` so both stop naming the hand-back cover; verify
  `grep -rn "hand-back cover" AGENTS.md docs` returns nothing.

## 4. Verification

- [x] 4.1 Run `node scripts/browser-check.mjs` and confirm every route step
  passes (GREEN).
- [x] 4.2 Run `npm run verify`, `node scripts/openspec-check.mjs` and
  `openspec validate --changes --strict`; confirm all three pass.

## Evidence

- RED: `node scripts/browser-check.mjs` failed at
  `scripts/browser-check.mjs:1666` with `AssertionError: a setup route opens
  without a hand-back cover (1 !== 0)`.
- GREEN: `node scripts/browser-check.mjs` passed every step after the deletion
  ("Browser checks passed: phone/tablet, night/day, Virgin, route cleanup,
  privacy, reload, cross-tab, languages, native role sheet, dialog contract,
  offline project-subpath reload, safe PWA update").
- `npm run verify` exited 0 with 480 passing tests; `node
  scripts/openspec-check.mjs` and `openspec validate --changes --strict` both
  passed.

## Workflow follow-up

- Commit on `refactor/remove-handback-cover`, push and open the pull request
  with `OpenSpec change: remove-handback-cover` and `Issue: #142` in the body.
- After the owner merges, sync the delta into `openspec/specs/app/ui-shell/`,
  archive the change, remove the worktree and delete the local branch.

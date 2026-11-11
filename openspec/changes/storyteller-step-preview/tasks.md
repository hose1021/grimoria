# Tasks

## 1. Tests first

- [x] 1.1 Extend `src/ui/screens/table/helpers.test.ts` with the blocking rule for a step, the night and day transition gates, the rejected-command reason and the six consequence states.
- [x] 1.2 Extend `js/strings.test.mjs` with a parity test over the new storyteller keys and a parity test over the guidance keys the step card renders.
- [x] 1.3 Run the two files before the implementation and record the failure.
- [x] 1.4 Extend `scripts/browser-check.mjs` with the blocked step, the visible reason, the target preview and a 1440 px smoke.

## 2. View model and ports

- [x] 2.1 Add `stepBlockers`, `nightTransitionBlockers`, `dayTransitionBlockers`, `rejectionOf`, `consequencesOf` and `logConsequence` to `src/ui/screens/table/helpers.ts`.
- [x] 2.2 Add `preview(command: CommandInput): DomainOutcome` to `ShellPorts.commands`; wire it in `src/entry/main.ts` from `previewCommand` with a content-derived preview id.
- [x] 2.3 Add the preview command, rejection and dismissal to `TableActions`; store the last rejection in `TableScreen` and render it as a dismissible `role="alert"` banner.

## 3. Cards

- [x] 3.1 Night step card: shows who wakes, what is allowed, the chosen targets and the active effects that touch the step.
- [x] 3.2 Night step card: previews the exact `completeNightStep` payload and lists the consequence states; the confirm button is disabled while a mandatory decision is open and names each reason.
- [x] 3.3 Night step card: a "Clear this step's input" control drops the drafts so a correction previews from empty instead of reapplying a trigger.
- [x] 3.4 Night card: the end-of-night button is blocked by a Demon heir or unfinished steps and shows the transition preview.
- [x] 3.5 Day card: the end-of-day button is blocked by an open nomination and shows the transition preview.
- [x] 3.6 Side panel: each log line carries the localized consequence category.

## 4. Strings

- [x] 4.1 Add every new key to `js/locales/ru.js`, `js/locales/en.js` and `js/locales/az.js` with the same placeholders.

## 5. Verification

- [x] 5.1 `node --test src/ui/screens/table/helpers.test.ts js/strings.test.mjs`
- [x] 5.2 `npm run typecheck`
- [x] 5.3 `npm test`
- [x] 5.4 `npm run verify`
- [x] 5.5 `node scripts/openspec-check.mjs`
- [x] 5.6 `openspec validate --changes --strict`
- [x] 5.7 `openspec validate --specs --strict`
- [x] 5.8 `git diff --check`
- [x] 5.9 Browser smoke of `/table` at 390 px and 1440 px.

## Evidence

- RED: `node --test src/ui/screens/table/helpers.test.ts js/strings.test.mjs` failed with `SyntaxError: The requested module './helpers.ts' does not provide an export named 'consequencesOf'` and `AssertionError: en:ui.stepWakes is translated`.
- GREEN: `node --test src/ui/screens/table/helpers.test.ts js/strings.test.mjs` passes 16/16, including `stepBlockers lists every unanswered mandatory decision in priority order`, `rejectionOf reports the engine reason for a rejected or Storyteller-choice command` and both locale parity tests.
- GREEN: `npm test` passes 275/275; `npm run typecheck` passes; `npm run verify` passes.
- GREEN: `node scripts/browser-check.mjs` passes every check, including the blocked Poisoner step, the visible target reason and the target preview at 390 px and 1440 px.

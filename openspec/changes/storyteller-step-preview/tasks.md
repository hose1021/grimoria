# Tasks

## 1. Tests first

- [x] 1.1 Extend `src/ui/screens/table/helpers.test.ts` with the step blocking rule, the rejected-command reason, the six consequence states, the expiry-vs-resolve distinction, the blocked attack result, the log categories and a real Imp-on-Soldier preview.
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
- [x] 3.4 Night card: the end-of-night button shows the engine transition preview and apply reuses its pinned id and timestamp.
- [x] 3.5 Day card: the end-of-day button stays enabled, shows the transition preview and reuses its pinned id and timestamp; the engine decides.
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
- GREEN: `node --test src/ui/screens/table/helpers.test.ts js/strings.test.mjs` passes 18/18, including `stepBlockers lists every unanswered mandatory decision in priority order`, `rejectionOf reports the engine reason for a rejected or Storyteller-choice command`, `a poison or protection expiry is not a scheduled death`, `a blocked attack result is a prevented death`, `logConsequence classifies prevented deaths and winners from stable fields`, `an Imp attack on a healthy Soldier previews a prevented death` and both locale parity tests.
- GREEN: `npm test` passes 276/276; `npm run typecheck` passes; `npm run verify` passes.
- GREEN: `node scripts/browser-check.mjs` passes every check, including the blocked Poisoner step, the preview rejection reason, the applied/no-scheduled split, the reset control, the prevented Soldier attack, the rejected-import banner and the 390 px/1440 px layouts.
- GREEN: with `node_modules` moved away, `node --test src/ui/screens/table/helpers.test.ts` passes 15/15: the test graph imports `ports.ts` as types only, and `toPreviewOutcome` lives in `helpers.ts`.
- Review round: the preview accepts `result.noDeath`, `future.delayedEffects` carry `kind`/`resolve`/`expires`, log lines classify from the entry kind and player life, the dead transition gates are removed, previews key on `viewVersion`, apply reuses the preview id and timestamp, effects are localized, and the unused keys are deleted.

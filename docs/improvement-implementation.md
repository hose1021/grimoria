# Research implementation

Implemented and checked on 2026-11-03; the source paths were updated for the
layered `src/` tree on 2026-11-13. The original review is retained in
[improvement-research.md](improvement-research.md) as a historical snapshot.

## Changes delivered

| Area | Result |
| --- | --- |
| Voting | At least half of living players is required: `ceil(living / 2)`. Even and odd counts are tested; code, guidance and documentation agree. |
| Route lifecycle | Mounts return cleanup; route changes, locale remounts, failed mounts and page lifecycle changes dispose handlers, timers and transient host state. |
| Handoff privacy | Number-picker data contains no role details; only the selected player's shown role is resolved. Auto-hide uses a fixed deadline. Returning to host routes covers secrets before reveal. |
| Names and recovery | Claimed names survive reload and legacy migration. A host correction can reopen an individual claim with a recorded reason and undo. |
| Persistence | Failed or throwing actions restore the previous state. Save failures remain visible and return `persisted: false` independently of domain success. Corrupt data is backed up and can be replaced. |
| Imports | Structural validation covers players, seats, phases, setup information, night/day blocks, effects and event references. Malformed current and legacy imports are rejected without replacing a valid game. |
| Tabs | Disk snapshots prevent stale sequential overwrites. Public tabs subscribe to saves and refresh their public projection. |
| Phone layout | Play, Players and Queue & Tools show the relevant surface without scrolling through the roster. Guidance starts collapsed and remembers expansion. Live controls and text are larger; long seat-action labels wrap. |
| Dialogs | Shared escaping and modal focus containment, initial focus, background inertness, labeling and focus restoration support host and player overlays. Text inputs do not rerender on blur before a pending button click. |
| Virgin | A dedicated host action resolves the first nomination, spends the ability when it does not trigger, and records the correct execution/death when it does. Ordinary votes remain at the table. |
| Localization | Matching keyed en/ru/az catalogs include live controls, role guides, help, timers, handoff text and domain error codes. Tests verify key and parameter parity. |
| Code structure | `src/core/engine/index.ts` remains the public API; implementation is split into context, effects, information, night, death, day, setup and corrections modules. Console guidance and overlays are separate modules; escaping/focus are shared. |
| Offline | A manifest and versioned service worker cache the runtime, three catalogs, fonts and role art. Installation readiness is visible. A fully precached update offers Update/Later; Update asks every open window to save before the worker activates, then reloads each controlled window once. A failed save in any window cancels activation, and a window that still cannot save defers its own reload with a recovery message. Later keeps the current version. Project-subpath offline reloads, preflight refusal, deferred reloads, multi-window reloads and the first upgrade from a pre-existing installation are tested. |
| Production source | The repository root is canonical. The old parallel source trees had already been removed before this implementation; no second app tree was introduced. |

## Verification

- The full `npm test` suite passes on Node 24, the CI runtime. This note does
  not repeat the test count; `npm test` is the source.
- Chromium browser checks run against a local server under `/pocket/`, exercising
  deployment-relative paths rather than only the origin root.
- Routes are checked at **360, 390 and 1440px**, plus a 1024px tablet scenario,
  without horizontal document overflow.
- A seven-player scenario reaches victory and the gated role review. A
  twelve-player scenario reaches victory after Scarlet Woman inheritance,
  including play after an offline reload.
- Regression checks exercise stale table listeners, interrupted player timers,
  covered host returns, correction/export dialogs, name preservation after
  reload, second-host blocking and live public-tab updates.
- A stale client detects a newly deployed worker, keeps playing after **Later**,
  and blocks activation when any window cannot save; each window reloads once
  onto the new cache only after the coordinated preflight. Old caches are
  separated and pruned after activation. A captured pre-update client shows the
  first-upgrade path: no prompt, continued play, then the new version after all
  old windows close.
- EN/RU/AZ switches and role sheets are exercised. The teaching demo is checked
  to leave the real game's saved data unchanged.
- Browser page errors and main-page console errors are checked. Screenshots of
  phone and tablet states are generated and visually inspected.

Run the unit suite with the command in the root README. Optional browser checks
are in `scripts/browser-check.mjs`; Playwright can be installed outside the repo.
Regenerate `sw.js` with `node scripts/build-offline.mjs` after changing runtime
assets. Actions performs the same regeneration before deployment.

## Practical limits

The browser scenarios simulate player decisions; they are not a usability
session with seven or twelve people. Physical-device testing in a dim room and
Firefox/Safari checks remain useful release validation.

Existing narrative log records and some scripted teaching-demo prose retain
their original Russian text; saved host notes are never translated. These are
distinct from the keyed live controls and translated role catalogs. The legacy
translator remains for older English-authored seat UI.

The app continues to be a local Storyteller aid, with no account system, server
or cross-device play. The same browser profile is trusted; its local storage is
not a security boundary against players using developer tools.

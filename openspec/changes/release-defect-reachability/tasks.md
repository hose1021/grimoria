# Tasks

## 1. Evidence

- [x] 1.1 Read Pit-Hag r2998, Tinker r1782, Dreamer r2904 and Sage r3009 from
      the pinned local snapshots.
- [x] 1.2 Reproduce each defect through the production `/table` route:
      `PG_BROWSER_CHECK=pithag-deaths`,
      `PG_BROWSER_CHECK=tinker-first-night`,
      `PG_BROWSER_CHECK=journal-pairs`.
- [x] 1.3 Record RED: `0 !== 1` for the Pit-Hag control, no first-night Tinker
      step, and no journal history control.

## 2. Implementation

- [x] 2.1 Add `canMarkStepDeaths` and use it in the step outcome panel.
- [x] 2.2 Declare the Tinker arm for any night and append the first-night step
      outside the printed order.
- [x] 2.3 Add `FIRST_NIGHT_TINKER_RULESET_VERSION` and keep the older gates on
      the new current version.
- [x] 2.4 Keep the journal preview and add the full-history control plus the
      host-choice case marker.
- [x] 2.5 Make the update-banner wait navigation-safe in the browser harness.

## 3. Verification

- [x] 3.1 `npm test` — 1386/1386.
- [x] 3.2 `npm run verify` — pass.
- [x] 3.3 `node scripts/openspec-check.ts` and
      `openspec validate --changes --strict` — pass.
- [x] 3.4 Full `node scripts/browser-check.ts` — pass, including the three new
      cases and the existing offline, phone and privacy checks.
- [x] 3.5 Regenerate `docs/audits/verification-gates/test-manifest.json` after
      the two renamed tests.

## Evidence

- RED: `PG_BROWSER_CHECK=pithag-deaths` reported `0 !== 1` for the death
  control after drafting `nodashii`; `PG_BROWSER_CHECK=tinker-first-night`
  reported no first-night Tinker step; `PG_BROWSER_CHECK=journal-pairs` found
  no `[data-log]` history control.
- GREEN: the same three focused checks pass, and the full browser suite passes
  with all three registered.
- Pit-Hag: role `nodashii`, victim dead, journal replay identical, undo restores
  both seats, redo reapplies.
- Tinker: night 1 opens on the Tinker; the death lands and the step advances;
  a Tea Lady neighbour prevents the same death.
- Journal: both recorded pairs sit beyond the eight-line preview, appear after
  expansion, survive reload, and replay with their pair entries.

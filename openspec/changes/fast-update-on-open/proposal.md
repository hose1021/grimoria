# Proposal

## Why

A deployed update reaches an open copy of the app minutes or hours late, and can
fail to install at all. The check that should run at page open is self-suppressed
for 30 minutes, the install downloads 15 MB of which about 5 MB belongs to locale
catalogs the app cannot load, and activation waits for a manual confirmation that
is refused whenever any open window cannot save. The host wants the app to be
current on open, and treats a lost game as an acceptable price.

Issue: #156

## What Changes

- The app SHALL check for an update as the first thing after registration, and
  the 30-minute throttle SHALL apply only to later checks.
- A worker that finishes installing during that opening check SHALL activate
  automatically: the window saves best-effort, sends `SKIP_WAITING`, and
  reloads once. No confirmation step and no save-failure veto.
- A worker that finishes installing after the opening check SHALL keep the
  prompt: the host decides when to reload mid-session.
- The save preflight across open windows (`PREPARE_UPDATE`) SHALL be removed
  from the generated worker and the page. `controllerchange` SHALL reload even
  when the window cannot save; the game in memory is lost in that case.
- The precache list SHALL exclude locale catalogs the catalog loader cannot
  request, which removes about 5 MB from every install.
- **BREAKING** (worker protocol): the `PREPARE_UPDATE` message no longer exists,
  and a waiting worker no longer needs a `PREPARE_UPDATE` confirmation before
  `SKIP_WAITING`.
- No game rule, command, storage key, state schema or route changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/offline`: the opening update check, automatic activation of a worker
  installed by that check, and the removal of the save preflight that currently
  blocks activation.
- `app/build-pipeline`: the offline asset list covers the catalogs the catalog
  loader can request and no other catalog.

## Impact

- `src/entry/offline.ts`: forced opening check, automatic `SKIP_WAITING` for the
  opening install, removal of the preflight and of the phases it produced.
- `scripts/build-offline.mjs`: the catalog filter for the asset list, generated
  from one shared locale map instead of a second hardcoded list.
- `src/infrastructure/catalog/role-catalog.ts`: the locale map moves to a data
  module both the loader and the generator import.
- `src/infrastructure/offline/offline-worker.test.ts`: the preflight tests are
  replaced by activation-without-preflight coverage.
- `scripts/browser-check.mjs`: the update scenario now covers an automatic
  reload on open, a prompted update after the opening check, and a save failure
  that no longer blocks the reload.
- `src/ui/i18n/locales/{ru,en,az}.ts`: strings for the removed phases go away.
- `openspec/specs/app/offline/spec.md` and
  `openspec/specs/app/build-pipeline/spec.md` after the merge.

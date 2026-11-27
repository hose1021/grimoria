# Offline Worker Specification

## Purpose

Defines how the generated service worker precaches the static app, activates a
new version without breaking a live game, and serves navigation offline.

## Requirements

### Requirement: Versioned precache

The generated worker SHALL precache one versioned asset set whose cache name is
derived from the runtime asset hashes and SHALL include the app shell.

**Source**: `SPEC.md` "Reliability and live-play additions"
**Tests**: `src/infrastructure/offline/offline-worker.test.ts`

#### Scenario: Generated cache name

- **WHEN** the worker is built
- **THEN** the cache name matches the versioned pattern and the shell is included

### Requirement: Cache pruning on activation

Activation SHALL delete older full caches for this deployment and keep unrelated caches. CSS and JavaScript chunks with content hashes SHALL remain available to existing windows still running their previous version until those windows reload or close.

**Source**: `SPEC.md` "Reliability and live-play additions"
**Tests**: `src/infrastructure/offline/offline-worker.test.ts`

#### Scenario: Old generated cache

- **WHEN** the new worker activates
- **THEN** the previous `pg-static-` cache is deleted and an unrelated cache remains

#### Scenario: A host defers updating a second window

- **WHEN** an active window defers reload and opens a screen it has never visited
- **THEN** the window can load its original screen chunk offline. Once those
  windows close or reload, later worker activity releases the retained chunks.

### Requirement: Offline navigation

Navigation SHALL use the cached shell and an asset request SHALL fall back to
the network when it is not cached.

**Source**: `SPEC.md` "Reliability and live-play additions"
**Tests**: `src/infrastructure/offline/offline-worker.test.ts`

#### Scenario: Offline reload

- **WHEN** the browser opens the app path with no network
- **THEN** the cached shell answers the navigation

#### Scenario: Uncached asset

- **WHEN** an asset is not in the cache
- **THEN** the worker requests it from the network

### Requirement: Update check on open

The app SHALL request a service worker update as soon as its registration
resolves on every page load, before any periodic throttle. The throttle SHALL
suppress only later checks.

**Source**: `SPEC.md` "Reliability and live-play additions"; issue #156
**Tests**: `scripts/browser-check.ts`

#### Scenario: Opening check runs at once

- **WHEN** the page loads and the deployed worker script differs from the active
  one
- **THEN** the browser fetches the worker script during boot and the changed
  worker starts installing without waiting for the interval

#### Scenario: Throttle covers only later checks

- **WHEN** the page becomes visible again shortly after the opening check
- **THEN** no second update request is made before the interval elapses

### Requirement: Automatic activation of the opening update

A worker that finishes installing during the opening check SHALL activate
without confirmation outside an active game. That window SHALL save best-effort,
send `SKIP_WAITING` and reload once. During an active game the window SHALL
wait for Update and a successful save before activation or reload. A failed
active-game save SHALL keep the session open and offer a retry.

**Source**: `SPEC.md` "Reliability and live-play additions"; issue #156
**Tests**: `src/entry/offline.test.ts`, `scripts/browser-check.ts`, `src/infrastructure/offline/offline-worker.test.ts`

#### Scenario: Opening update applies by itself

- **WHEN** a changed worker reaches the installed state during the opening check
  in a controlled window outside an active game
- **THEN** the window sends `SKIP_WAITING` and reloads once with no user action

#### Scenario: Failed save does not block

- **WHEN** a window outside an active game cannot save before reload
- **THEN** it reloads anyway and runs the new version

#### Scenario: Opening update during active play

- **WHEN** the opening check finds a waiting worker during an active game
- **THEN** the host can defer it or choose Update, and a failed save leaves
  the session open for retry

#### Scenario: Another window activates the worker

- **WHEN** a different window activates an update during active play
- **THEN** the active window keeps its session open until the host chooses
  Update and it saves successfully

#### Scenario: First install does not reload

- **WHEN** no worker controls the page yet
- **THEN** the page does not reload, because there is no version to replace

#### Scenario: One reload only

- **WHEN** the reloaded page runs its own opening check against the version it
  already runs
- **THEN** no further worker installs and no further reload happens

### Requirement: Activation after the opening check

A worker installed by a later check SHALL NOT reload a window in use. The app
SHALL show its update prompt, and activation SHALL start only when the host
applies it.

**Source**: `SPEC.md` "Reliability and live-play additions"; issue #156
**Tests**: `scripts/browser-check.ts`

#### Scenario: Later update waits for the host

- **WHEN** a worker finishes installing after the opening check
- **THEN** the prompt appears and the window keeps running its current version
  until the host applies the update

#### Scenario: Install finishes before the event

- **WHEN** the worker finishes installing before the page receives the update
  event
- **THEN** the prompt still appears and the window keeps running its current
  version

#### Scenario: Applying a later update

- **WHEN** the host applies the prompt
- **THEN** an active game is saved successfully before activation and reload,
  while an inactive window saves best-effort

#### Scenario: Worker does not activate

- **WHEN** the waiting worker has not activated within the activation timeout
- **THEN** the prompt reports the failure and offers a retry, and the saved game
  is unchanged

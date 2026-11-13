# Spec Delta

## REMOVED Requirements

### Requirement: Explicit activation

**Reason**: The save preflight across open windows blocked activation whenever
any window could not write its game, so a deployed update could stay unapplied
for a whole game night. The host accepts the loss of an unsaved game in exchange
for being current, so activation no longer asks other windows for permission.

**Migration**: No action for users. The page sends `SKIP_WAITING` from the
opening check and after an explicit Apply; `PREPARE_UPDATE` and its reply channel
are removed from the worker. A window saves best-effort before the reload.

## ADDED Requirements

### Requirement: Update check on open

The app SHALL request a service worker update as soon as its registration
resolves on every page load, before any periodic throttle. The throttle SHALL
suppress only later checks.

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
without a confirmation: the window SHALL save its game best-effort, send
`SKIP_WAITING`, and reload once. A failed save SHALL NOT prevent the reload.

#### Scenario: Opening update applies by itself

- **WHEN** a changed worker reaches the installed state during the opening check
  in a controlled window
- **THEN** the window sends `SKIP_WAITING` and reloads once with no user action

#### Scenario: Failed save does not block

- **WHEN** the window cannot write the game before the reload
- **THEN** it reloads anyway and runs the new version

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

#### Scenario: Later update waits for the host

- **WHEN** a worker finishes installing after the opening check
- **THEN** the prompt appears and the window keeps running its current version
  until the host applies the update

#### Scenario: Applying a later update

- **WHEN** the host applies the prompt
- **THEN** the window saves best-effort, sends `SKIP_WAITING` and reloads once

#### Scenario: Worker does not activate

- **WHEN** the waiting worker has not activated within the activation timeout
- **THEN** the prompt reports the failure and offers a retry, and the saved game
  is unchanged
